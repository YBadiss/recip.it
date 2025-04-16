import { RecipeExtractor } from '../src/services/recipe-extractor';
import { YouTubeContentFetcher, WebContentFetcher } from '../src/services/content-fetcher';
import OpenAI from 'openai';
import { Config } from '../src/config';

describe('Recipe Extractor Service E2E Tests', () => {
  // Skip tests if no API key is set
  const runTest = Config.OPENAI_API_KEY ? it : it.skip;
  const runYoutubeTest = Config.SUPADATA_API_KEY ? it : it.skip;
  let recipeExtractor: RecipeExtractor;
  let youtubeContentFetcher: YouTubeContentFetcher;
  let webContentFetcher: WebContentFetcher;

  beforeEach(() => {
    // Initialize content fetchers
    youtubeContentFetcher = new YouTubeContentFetcher();
    webContentFetcher = new WebContentFetcher();

    // Initialize RecipeExtractor with OpenAI and content fetchers
    const openai = new OpenAI({
      apiKey: Config.OPENAI_API_KEY,
    });
    recipeExtractor = new RecipeExtractor(openai, [youtubeContentFetcher, webContentFetcher]);
  });

  // Skip fetch content test since fetchRecipeContent is now private
  runTest.skip('should fetch recipe content from a known URL', async () => {
    // This test is skipped because fetchRecipeContent is now private
  });

  // Test extracting recipe details from YouTube
  runYoutubeTest('should extract recipe details from YouTube', async () => {
    // Use a standard YouTube cooking video
    const url = 'https://www.youtube.com/watch?v=rDEnIFrJJ9c'; // Basic banana bread video

    try {
      // Extract recipe from YouTube URL
      const recipe = await recipeExtractor.extractRecipeFromUrl(url);

      // Verify basic recipe structure
      expect(recipe).toBeDefined();
      expect(recipe.title).toBeDefined();
      expect(recipe.ingredients).toBeDefined();
      expect(recipe.steps).toBeDefined();
    } catch (error) {
      console.error('YouTube extraction test failed:', error);
      throw error;
    }
  },
  30000
  ); // Increase timeout to 30 seconds for the full extraction process

  // Test extracting recipe details from a specific URL
  runTest('should extract recipe details from a URL', async () => {
    // Use a standard recipe site
    const url = 'https://www.allrecipes.com/recipe/21014/good-old-fashioned-pancakes/';
    const recipe = await recipeExtractor.extractRecipeFromUrl(url);

    // Verify recipe details were extracted
    expect(recipe).toBeDefined();
    expect(recipe.title).toBeDefined();
    expect(recipe.ingredients?.length).toBeGreaterThan(0);
    expect(recipe.steps?.length).toBeGreaterThan(0);

    // Verify titles contain expected terms
    expect(recipe.title?.toLowerCase()).toContain('pancake');
  });

  // Test extracting recipe details manually
  runTest('should extract recipe details from manual content', async () => {
    const content = `
      Pancake Recipe

      Ingredients:
      - 1 1/2 cups all-purpose flour
      - 3 1/2 teaspoons baking powder
      - 1 teaspoon salt
      - 1 tablespoon white sugar
      - 1 1/4 cups milk
      - 1 egg
      - 3 tablespoons butter, melted

      Instructions:
      1. In a large bowl, sift together the flour, baking powder, salt and sugar.
      2. Make a well in the center and pour in the milk, egg and melted butter; mix until smooth.
      3. Heat a lightly oiled griddle or frying pan over medium-high heat.
      4. Pour or scoop the batter onto the griddle, using approximately 1/4 cup for each pancake.
      5. Brown on both sides and serve hot.
    `;

    // Test extracting recipe details from content
    const extractedRecipe = await recipeExtractor.extractRecipeFromContent('test-url', content, '', undefined);

    // Verify extracted recipe
    expect(extractedRecipe).toBeDefined();
    expect(extractedRecipe.title).toBeDefined();
    expect(extractedRecipe.ingredients?.length).toBeGreaterThan(0);
    expect(extractedRecipe.steps?.length).toBeGreaterThan(0);

    // Verify recipe details are as expected
    expect(extractedRecipe.title?.toLowerCase()).toContain('pancake');
    expect(extractedRecipe.ingredients?.some(i => i.name.toLowerCase().includes('flour'))).toBeTruthy();
    expect(extractedRecipe.ingredients?.some(i => i.name.toLowerCase().includes('egg'))).toBeTruthy();
    expect(extractedRecipe.ingredients?.some(i => i.name.toLowerCase().includes('milk'))).toBeTruthy();
    expect(extractedRecipe.steps?.some(s => s.action.toLowerCase().includes('bowl'))).toBeTruthy();
    expect(extractedRecipe.steps?.some(s => s.action.toLowerCase().includes('griddle'))).toBeTruthy();
  });
});
