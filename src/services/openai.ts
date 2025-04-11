import OpenAI from 'openai';
import dotenv from 'dotenv';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { Ingredient, Material, Step } from '../models/recipe';

dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Function to fetch the content of a recipe URL
export const fetchRecipeContent = async (url: string): Promise<string> => {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    
    // Remove scripts, styles, and other non-content elements
    $('script, style, iframe, noscript, svg').remove();
    
    // Extract the main content
    const content = $('body').text();
    
    // Clean up the content (remove excessive whitespace)
    return content.replace(/\s+/g, ' ').trim();
  } catch (error) {
    console.error('Error fetching recipe content:', error);
    throw new Error(`Failed to fetch content from URL: ${url}`);
  }
};

// Interface for extracted recipe
export interface ExtractedRecipe {
  title: string;
  ingredients: Ingredient[];
  materials: Material[];
  steps: Step[];
  tags: string[];
}

// Function to generate mock recipe data based on URL
// Used as fallback when OpenAI API is unavailable
const generateMockRecipe = (url: string): ExtractedRecipe => {
  // Extract recipe name from URL
  const urlParts = url.split('/');
  let recipeName = urlParts[urlParts.length - 1].replace(/-/g, ' ').replace(/\.(html|php|aspx)$/, '');
  
  // Capitalize each word
  recipeName = recipeName.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  // Create mock ingredients with IDs
  const ingredients: Ingredient[] = [
    { id: "ing1", name: "flour", quantity: "120", unit: "g" },
    { id: "ing2", name: "eggs", quantity: "2" },
    { id: "ing3", name: "milk", quantity: "240", unit: "ml" },
    { id: "ing4", name: "salt", quantity: "2.5", unit: "g" }
  ];
  
  // Create mock materials with IDs
  const materials: Material[] = [
    { id: "mat1", name: "mixing bowl", description: "large" },
    { id: "mat2", name: "whisk" },
    { id: "mat3", name: "measuring cups" },
    { id: "mat4", name: "baking pan", description: "23x33 cm" }
  ];
  
  // Create mock steps with references to ingredient and material IDs
  const steps: Step[] = [
    { 
      action: "Mix the dry ingredients together", 
      ingredients: ["ing1", "ing4"],
      materials: ["mat1"]
    },
    { 
      action: "Add wet ingredients and mix until smooth", 
      ingredients: ["ing2", "ing3"],
      materials: ["mat2"]
    },
    { 
      action: "Pour into baking pan and bake according to preferences", 
      ingredients: [],
      materials: ["mat4"]
    }
  ];
  
  return {
    title: recipeName || "Sample Recipe",
    ingredients,
    materials,
    steps,
    tags: ["quick", "easy", "basic"]
  };
};

// Function to extract recipe details using OpenAI
export const extractRecipeDetails = async (url: string, content: string): Promise<ExtractedRecipe> => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Use appropriate model
      messages: [
        {
          role: "system",
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

Be accurate and comprehensive in your extraction. If certain information is clearly missing, provide empty arrays or reasonable defaults.`
        },
        {
          role: "user",
          content: `Recipe URL: ${url}\n\nContent: ${content}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Ensure all required fields are present with proper structure
    return {
      title: result.title || "Untitled Recipe",
      ingredients: Array.isArray(result.ingredients) ? result.ingredients : [],
      materials: Array.isArray(result.materials) ? result.materials : [],
      steps: Array.isArray(result.steps) ? result.steps : [],
      tags: Array.isArray(result.tags) ? result.tags : []
    };
  } catch (error) {
    console.error('Error extracting recipe details with OpenAI:', error);
    throw new Error('Failed to extract recipe details: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}; 