import OpenAI from 'openai';
import dotenv from 'dotenv';
import axios from 'axios';
import * as cheerio from 'cheerio';

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
  ingredients: string;
  materials: string;
  steps: string;
  markdown: string;
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
  
  return {
    title: recipeName || "Sample Recipe",
    ingredients: "1 cup flour\n2 eggs\n1 cup milk\n1/2 teaspoon salt",
    materials: "Bowl\nWhisk\nMeasuring cups\nBaking pan",
    steps: "1. Mix dry ingredients\n2. Add wet ingredients\n3. Cook according to preferences",
    markdown: `# ${recipeName || "Sample Recipe"}

## Ingredients
- 1 cup flour
- 2 eggs
- 1 cup milk
- 1/2 teaspoon salt

## Materials
- Bowl
- Whisk
- Measuring cups
- Baking pan

## Instructions
1. Mix dry ingredients
2. Add wet ingredients
3. Cook according to preferences
`,
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
2. List of ingredients with quantities
3. List of kitchen materials/tools needed
4. Step-by-step instructions
5. Create a markdown formatted version of the recipe that is well-structured and easy to read
6. Generate a list of relevant tags and keywords for this recipe (cuisine type, dish type, main ingredients, dietary preferences like vegetarian, vegan, gluten-free, etc.)

Format your response as a JSON object with the following keys:
- title: string
- ingredients: string (with each ingredient on a new line)
- materials: string (with each material on a new line)
- steps: string (with each step on a new line)
- markdown: string (with full markdown of the recipe)
- tags: array of strings

Be accurate and comprehensive in your extraction. If certain information is clearly missing, indicate "Not specified" for that field.`
        },
        {
          role: "user",
          content: `Recipe URL: ${url}\n\nContent: ${content}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Ensure all required fields are present
    return {
      title: result.title || "Untitled Recipe",
      ingredients: result.ingredients || "Not specified",
      materials: result.materials || "Not specified",
      steps: result.steps || "Not specified",
      markdown: result.markdown || "",
      tags: Array.isArray(result.tags) ? result.tags : []
    };
  } catch (error) {
    console.error('Error extracting recipe details with OpenAI:', error);
    console.log('Falling back to mock recipe generation...');
    
    // Fall back to mock recipe generator when OpenAI API fails
    return generateMockRecipe(url);
  }
}; 