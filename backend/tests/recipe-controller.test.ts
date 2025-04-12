import { RecipeController } from '../src/controllers/recipe-controller';
import { RecipeStore } from '../src/models/recipe-store';
import { RecipeFetcher } from '../src/services/recipe-fetcher';
import { Request, Response } from 'express';
import { normalizeUrl } from '../src/utils/url-normalizer';

// Mock dependencies
jest.mock('../src/models/recipe-store');
jest.mock('../src/services/recipe-fetcher');
jest.mock('../src/utils/url-normalizer');

describe('Recipe Controller Tests', () => {
  let recipeController: RecipeController;
  let mockRecipeStore: jest.Mocked<RecipeStore>;
  let mockRecipeFetcher: jest.Mocked<RecipeFetcher>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create mock instances
    mockRecipeStore = new RecipeStore({} as any) as jest.Mocked<RecipeStore>;
    mockRecipeFetcher = new RecipeFetcher({} as any, {} as any) as jest.Mocked<RecipeFetcher>;
    
    // Create controller with mocks
    recipeController = new RecipeController(mockRecipeStore, mockRecipeFetcher);
    
    // Setup request and response mocks
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    
    mockReq = {
      body: {},
      params: {},
    };
    
    // Setup URL normalizer mock
    (normalizeUrl as jest.Mock).mockImplementation((url) => `normalized-${url}`);
  });
  
  it('should return existing recipe if URL already exists', async () => {
    // Setup request with a URL
    mockReq.body = {
      link: 'https://example.com/recipe',
    };
    
    // Setup normalized URL
    const normalizedUrl = 'normalized-https://example.com/recipe';
    
    // Mock existing recipe
    const existingRecipe = {
      id: 'existing-id',
      title: 'Existing Recipe',
      link: normalizedUrl,
    };
    
    // Setup mocks
    mockRecipeStore.getRecipeByNormalizedLink = jest.fn().mockResolvedValue(existingRecipe);
    
    // Call create recipe
    await recipeController.createRecipe(mockReq as Request, mockRes as Response);
    
    // Verify URL was normalized
    expect(normalizeUrl).toHaveBeenCalledWith('https://example.com/recipe');
    
    // Verify we checked for existing recipe
    expect(mockRecipeStore.getRecipeByNormalizedLink).toHaveBeenCalledWith(normalizedUrl);
    
    // Verify we returned the existing recipe instead of creating a new one
    expect(mockRecipeFetcher.extractRecipeFromUrl).not.toHaveBeenCalled();
    expect(mockRecipeStore.createRecipe).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      ...existingRecipe,
      message: 'Recipe with this URL already exists',
    });
  });
  
  it('should extract and create new recipe if URL does not exist', async () => {
    // Setup request with a URL
    mockReq.body = {
      link: 'https://example.com/new-recipe',
    };
    
    // Setup normalized URL
    const normalizedUrl = 'normalized-https://example.com/new-recipe';
    
    // Setup extracted recipe data
    const extractedRecipe = {
      title: 'New Recipe',
      ingredients: [{ id: 'ing1', name: 'Ingredient' }],
      materials: [],
      steps: [{ action: 'Step 1', ingredients: ['ing1'] }],
      tags: ['tag1'],
      imageUrl: 'image.jpg',
      cookingTime: '30 minutes',
      servings: 4,
    };
    
    // Setup created recipe
    const createdRecipe = {
      id: 'new-id',
      ...extractedRecipe,
      link: normalizedUrl,
    };
    
    // Setup mocks
    mockRecipeStore.getRecipeByNormalizedLink = jest.fn().mockResolvedValue(null);
    mockRecipeFetcher.extractRecipeFromUrl = jest.fn().mockResolvedValue(extractedRecipe);
    mockRecipeStore.createRecipe = jest.fn().mockResolvedValue('new-id');
    mockRecipeStore.getRecipeById = jest.fn().mockResolvedValue(createdRecipe);
    
    // Call create recipe
    await recipeController.createRecipe(mockReq as Request, mockRes as Response);
    
    // Verify URL was normalized
    expect(normalizeUrl).toHaveBeenCalledWith('https://example.com/new-recipe');
    
    // Verify we checked for existing recipe
    expect(mockRecipeStore.getRecipeByNormalizedLink).toHaveBeenCalledWith(normalizedUrl);
    
    // Verify we extracted recipe details
    expect(mockRecipeFetcher.extractRecipeFromUrl).toHaveBeenCalledWith(normalizedUrl);
    
    // Verify we created the recipe
    expect(mockRecipeStore.createRecipe).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(createdRecipe);
  });
}); 