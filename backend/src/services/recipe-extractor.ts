import { OpenAI } from 'openai';
import { Ingredient, Material, Step } from '../models/recipe';
import { Config } from '../config';
import { ChatCompletionMessageParam } from 'openai/resources/chat';
import { ContentFetcher, RecipeContent } from './content-fetcher';
import { ChatCompletionContentPartText, ChatCompletionContentPartImage } from 'openai/resources/chat/completions';

// Interface for extracted recipe - aligned with Recipe model
export interface ExtractedRecipe {
  title?: string;
  ingredients?: Ingredient[]; // Use Ingredient type
  materials?: Material[]; // Use Material type
  steps?: Step[]; // Use Step type
  tags?: string[];
  imageUrl?: string;
  cookingTime?: string;
  servings?: number;
}

export interface IRecipeExtractor {
  extractRecipeFromUrl(url: string): Promise<ExtractedRecipe>;
  extractRecipeFromContent(
    url: string,
    imageUrl: string,
    userContext?: string,
    systemContext?: string,
    textContent?: string,
    imageContent?: string
  ): Promise<ExtractedRecipe>;
}

export class RecipeExtractor implements IRecipeExtractor {
  private openai: OpenAI;
  private fetchers: ContentFetcher[];

  constructor(openai: OpenAI, fetchers: ContentFetcher[]) {
    this.openai = openai;
    this.fetchers = fetchers;
  }

  async extractRecipeFromUrl(url: string): Promise<ExtractedRecipe> {
    const content = await this.fetchRecipeContent(url);
    return this.extractRecipeFromContent(url, content.imageUrl, content.userContext, content.systemContext, content.text, );
  }

  // Function to fetch the content of a recipe URL
  private async fetchRecipeContent(
    url: string
  ): Promise<RecipeContent> {
    // Find the appropriate fetcher for this URL
    for (const fetcher of this.fetchers) {
      if (fetcher.canFetchContent(url)) {
        return await fetcher.fetchContent(url);
      }
    }

    // If no fetcher was found (should never happen with proper configuration)
    throw new Error(`No content fetcher available for URL: ${url}`);
  }

  // Function to extract recipe details using OpenAI
  async extractRecipeFromContent(
    url: string,
    imageUrl: string,
    userContext?: string,
    systemContext?: string,
    textContent?: string,
    imageContent?: string
  ): Promise<ExtractedRecipe> {
    const systemMessage: ChatCompletionMessageParam = {
      role: 'system',
      content: `You are a recipe extraction expert. Extract the following from the recipe content:

1. Title of the recipe
2. List of ingredients with quantities and units. IMPORTANT: preserve amounts (e.g. for fruits/vegetables) while also providing metric conversions.
3. List of kitchen materials/tools needed
4. Step-by-step instructions with references to which ingredients and materials are used in each step. Make sure to capture all important cooking details.
5. Total cooking time (including preparation)
6. Number of servings or portions

Format your response as a JSON object with the following keys:
- title: string
- ingredients: array of objects with { id: string, name: string, quantity?: string, unit?: string }
- materials: array of objects with { id: string, name: string, description?: string }
- steps: array of objects with { action: string, ingredients: string[], materials: string[] }
- tags: array of strings (cuisine type, dish type, main ingredients, dietary preferences)
- cookingTime: string (e.g., "30 minutes", "1 hour 15 minutes")
- servings: number (e.g., 4, 6, 8)

Important rules:
1. Preserve the original language of the recipe - DO NOT TRANSLATE IT
2. Assign a unique identifier (id) to each ingredient and material (e.g., "ing1", "ing2", "mat1", "mat2") but only mention these ids in steps.ingredients and steps.materials, never in steps.action
3. In the steps, reference ingredients and materials by their IDs
4. Never invent quantities or units. If you cannot find the quantity or unit, leave the field empty.
5. Convert all unit measurements to metric units:
   - Volume: milliliters (ml)
   - Weight: grams (g)
   - Length: centimeters (cm)
   - Temperature: Celsius (°C)
6. Preserve ALL important cooking details such as:
   - Exact cooking times ("simmer for 7 minutes" not just "simmer")
   - Cooking methods and techniques
   - Temperature settings
   - Visual cues ("until golden brown")
   - Texture indicators ("until soft and translucent")
7. If the same ingredient appears multiple times in different contexts, assign it a new ID each time
8. For cooking time, use a standardized format (e.g., "30 minutes", "1 hour 30 minutes")
9. For servings, provide a reasonable estimate if not explicitly stated.
10. Split steps with too many actions into multiple smaller steps. Each step should focus on a single action or a small set of closely related actions.
   For example, in this French recipe:
   "Épluchez, lavez et séchez les pommes de terre puis coupez en rondelles fines. Pelez les gousses d'ail et émincez-les."
   Should be split into:
   "Épluchez, lavez et séchez les pommes de terre."
   "Coupez les pommes de terre en rondelles fines."
   "Pelez les gousses d'ail et émincez-les."

${systemContext}

Be accurate and comprehensive in your extraction. If certain information is clearly missing, provide empty arrays or reasonable defaults.`,
    };

    const contentParts = [];
    
    if (textContent) {
      contentParts.push({
        type: 'text',
        text: `Recipe URL: ${url}\n\n${userContext ? `Context: ${userContext}\n\n` : ''}Content: ${textContent}`
      } as ChatCompletionContentPartText);
    }
    
    if (imageContent) {
      contentParts.push({
        type: 'image_url',
        image_url: {
          url: imageContent
        }
      } as ChatCompletionContentPartImage);
    }
    
    const userMessage: ChatCompletionMessageParam = {
      role: 'user',
      content: contentParts
    };

    const messages: ChatCompletionMessageParam[] = [
      systemMessage,
      userMessage
    ];

    console.log(messages);

    try {
      const response = await this.openai.chat.completions.create({
        model: Config.OPENAI_MODEL,
        messages,
        response_format: { type: 'json_object' },
      });

      console.log(response.choices[0].message.content);

      const result = JSON.parse(response.choices[0].message.content || '{}');

      // Ensure all required fields are present with proper structure
      return {
        title: result.title || 'Untitled Recipe',
        ingredients: Array.isArray(result.ingredients) ? result.ingredients : [],
        materials: Array.isArray(result.materials) ? result.materials : [],
        steps: Array.isArray(result.steps) ? result.steps : [],
        tags: Array.isArray(result.tags) ? result.tags : [],
        imageUrl: imageUrl || '',
        cookingTime: result.cookingTime || '',
        servings: result.servings || 0,
      };
    } catch (error) {
      console.error('Error extracting recipe details with OpenAI:', error);
      throw new Error(
        'Failed to extract recipe details: ' +
          (error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }
} 