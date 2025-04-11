import { OpenAI } from 'openai';
import { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import { Ingredient, Material, Step } from '../models/recipe';
import { Config } from '../config';

// Interface for extracted recipe
export interface ExtractedRecipe {
  title: string;
  ingredients: Ingredient[];
  materials: Material[];
  steps: Step[];
  tags: string[];
}

export class RecipeFetcher {
  private openai: OpenAI;
  private axios: AxiosInstance;

  constructor(openai: OpenAI, axios: AxiosInstance) {
    this.openai = openai;
    this.axios = axios;
  }

  // Function to fetch the content of a recipe URL
  async fetchRecipeContent(url: string): Promise<string> {
    try {
      const response = await this.axios.get(url);
      const $ = cheerio.load(response.data);

      // Remove scripts, styles, and other non-content elements
      $('script, style, nav, header, footer, iframe, noscript').remove();

      // Extract the main content
      const content = $('body').text().trim();

      // Clean up the content (remove excessive whitespace)
      return content.replace(/\s+/g, ' ');
    } catch (error) {
      console.error('Error fetching recipe content:', error);
      throw new Error(
        `Failed to fetch content from URL: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Function to extract recipe details using OpenAI
  async extractRecipeDetails(
    url: string,
    content: string
  ): Promise<ExtractedRecipe> {
    try {
      const response = await this.openai.chat.completions.create({
        model: Config.OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content: `You are a recipe extraction expert. Extract the following from the recipe content:

1. Title of the recipe
2. List of ingredients with quantities and units (convert all measurements to metric units: grams, milliliters, centimeters, Celsius)
3. List of kitchen materials/tools needed
4. Step-by-step instructions with references to which ingredients and materials are used in each step

Format your response as a JSON object with the following keys:
- title: string
- ingredients: array of objects with { id: string, name: string, quantity?: string, unit?: string }
- materials: array of objects with { id: string, name: string, description?: string }
- steps: array of objects with { action: string, ingredients: string[], materials: string[] }
- tags: array of strings (cuisine type, dish type, main ingredients, dietary preferences)

Important rules:
1. Assign a unique identifier (id) to each ingredient and material (e.g., "ing1", "ing2", "mat1", "mat2")
2. Convert all measurements to metric units:
   - Volume: milliliters (ml)
   - Weight: grams (g)
   - Length: centimeters (cm)
   - Temperature: Celsius (°C)
3. In the steps, reference ingredients and materials by their IDs
4. If the same ingredient appears multiple times in different contexts, assign it a new ID each time

Be accurate and comprehensive in your extraction. If certain information is clearly missing, provide empty arrays or reasonable defaults.`,
          },
          {
            role: 'user',
            content: `Recipe URL: ${url}\n\nContent: ${content}`,
          },
        ],
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');

      // Ensure all required fields are present with proper structure
      return {
        title: result.title || 'Untitled Recipe',
        ingredients: Array.isArray(result.ingredients) ? result.ingredients : [],
        materials: Array.isArray(result.materials) ? result.materials : [],
        steps: Array.isArray(result.steps) ? result.steps : [],
        tags: Array.isArray(result.tags) ? result.tags : [],
      };
    } catch (error) {
      console.error('Error extracting recipe details with OpenAI:', error);
      throw new Error(
        'Failed to extract recipe details: ' +
          (error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  // Function to extract recipe from URL
  async extractRecipeFromUrl(url: string): Promise<ExtractedRecipe> {
    // Fetch content from the URL
    const content = await this.fetchRecipeContent(url);

    // Extract recipe details using OpenAI
    return await this.extractRecipeDetails(url, content);
  }
} 