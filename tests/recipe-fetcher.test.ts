import { RecipeFetcher } from '../src/services/recipe-fetcher';
import OpenAI from 'openai';
import axios from 'axios';
import { Config } from '../src/config';

describe('Recipe Fetcher Service E2E Tests', () => {
  // Skip tests if no API key is set
  const runTest = Config.OPENAI_API_KEY ? it : it.skip;
  let recipeFetcher: RecipeFetcher;
  
  beforeEach(() => {
    // Initialize RecipeFetcher with OpenAI and axios
    const openai = new OpenAI({
      apiKey: Config.OPENAI_API_KEY,
    });
    recipeFetcher = new RecipeFetcher(openai, axios);
  });
  
  // Test fetching recipe content from a URL
  runTest('should fetch recipe content from a known URL', async () => {
    // Use a well-established recipe site that's unlikely to change
    const url = 'https://www.allrecipes.com/recipe/21014/good-old-fashioned-pancakes/';
    const content = await recipeFetcher.fetchRecipeContent(url);
    
    // Verify content was fetched
    expect(content).toBeDefined();
    expect(content.length).toBeGreaterThan(100);
    
    // Verify content contains expected recipe-related terms
    expect(content).toContain('pancake');
  });
  
  // Skip the long-running extraction test by default
  it.skip('should extract recipe details from content using OpenAI', async () => {
    // Simplified recipe content for testing
    const url = 'https://example.com/pancakes';
    const content = `
      Classic Pancakes
      
      Ingredients:
      1 cup all-purpose flour
      2 tablespoons sugar
      2 teaspoons baking powder
      1/2 teaspoon salt
      1 cup milk
      2 tablespoons vegetable oil
      1 large egg
      
      Tools:
      Mixing bowl
      Whisk
      Griddle or frying pan
      Spatula
      
      Instructions:
      1. In a mixing bowl, combine flour, sugar, baking powder, and salt.
      2. Add milk, oil, and egg to the dry mixture, then whisk until just combined.
      3. Heat griddle or pan over medium heat and lightly oil the surface.
      4. Pour 1/4 cup of batter onto the griddle for each pancake.
      5. Cook until bubbles form on the surface, then flip and cook until golden brown.
      6. Serve warm with maple syrup or toppings of your choice.
    `;
    
    // Extract recipe details
    const extractedRecipe = await recipeFetcher.extractRecipeDetails(url, content);
    
    // Verify extracted data structure
    expect(extractedRecipe).toBeDefined();
    expect(extractedRecipe.title).toContain('Pancake');
    
    // Verify ingredients were extracted correctly
    expect(extractedRecipe.ingredients).toHaveLength(7);
    expect(extractedRecipe.ingredients[0]).toHaveProperty('id');
    expect(extractedRecipe.ingredients[0]).toHaveProperty('name');
    
    // Check for flour conversion to metric (accept either 'g' or 'grams')
    const flour = extractedRecipe.ingredients.find(i => i.name.includes('flour'));
    expect(flour).toBeDefined();
    expect(['g', 'grams']).toContain(flour?.unit);
    
    // Verify materials were extracted (the test should accept 4 or 5 materials)
    expect(extractedRecipe.materials.length).toBeGreaterThanOrEqual(4);
    expect(extractedRecipe.materials[0]).toHaveProperty('id');
    expect(extractedRecipe.materials[0]).toHaveProperty('name');
    
    // Verify steps were extracted
    expect(extractedRecipe.steps).toHaveLength(6);
    expect(extractedRecipe.steps[0]).toHaveProperty('action');
    expect(extractedRecipe.steps[0]).toHaveProperty('ingredients');
    expect(extractedRecipe.steps[0]).toHaveProperty('materials');
    
    // Verify step 1 references dry ingredients and mixing bowl
    const step1 = extractedRecipe.steps[0];
    expect(step1.ingredients?.length).toBeGreaterThan(0);
    expect(step1.materials?.length).toBeGreaterThan(0);
    
    // Verify tags were assigned
    expect(extractedRecipe.tags.length).toBeGreaterThan(0);
  });
}); 