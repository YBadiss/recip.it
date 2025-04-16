import { RecipeController } from '../src/controllers/recipe-controller';
import { RecipeStore } from '../src/models/recipe-store';
import { RecipeExtractor } from '../src/services/recipe-extractor';
import { Request, Response } from 'express';
import { normalizeUrl } from '../src/utils/url-normalizer';
import { UserStore } from '../src/models/user-store';

// Mock dependencies
jest.mock('../src/models/recipe-store');
jest.mock('../src/services/recipe-extractor');
jest.mock('../src/utils/url-normalizer');
jest.mock('../src/models/user-store');

// Extend Request to include user property for tests
import 'express';
declare module 'express' {
  interface Request {
    user?: {
      userId: string;
      username: string;
      authorizedEndpoints: string[];
    };
  }
}

describe('Recipe Controller Tests', () => {
  let recipeController: RecipeController;
  let mockRecipeStore: jest.Mocked<RecipeStore>;
  let mockRecipeExtractor: jest.Mocked<RecipeExtractor>;
  let mockUserStore: jest.Mocked<UserStore>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockRecipeStore = new RecipeStore({} as any) as jest.Mocked<RecipeStore>;
    mockRecipeExtractor = new RecipeExtractor({} as any, [] as any) as jest.Mocked<RecipeExtractor>;
    mockUserStore = new UserStore({} as any) as jest.Mocked<UserStore>;

    // Create controller with mocks
    recipeController = new RecipeController(mockRecipeStore, mockRecipeExtractor, mockUserStore);

    // Setup request and response mocks
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockReq = {
      body: {},
      params: {},
      user: {
        userId: 'test-user-id',
        username: 'test@example.com',
        authorizedEndpoints: ['all'],
      },
    };

    // Setup URL normalizer mock
    (normalizeUrl as jest.Mock).mockImplementation(url => `normalized-${url}`);
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
    mockUserStore.addRecipeToUser = jest.fn().mockResolvedValue(undefined);
    mockRecipeStore.getRecipeById = jest.fn().mockResolvedValue(existingRecipe);

    // Call create recipe
    await recipeController.createRecipe(mockReq as Request, mockRes as Response);

    // Verify URL was normalized
    expect(normalizeUrl).toHaveBeenCalledWith('https://example.com/recipe');

    // Verify we checked for existing recipe
    expect(mockRecipeStore.getRecipeByNormalizedLink).toHaveBeenCalledWith(normalizedUrl);

    // Verify we returned the existing recipe instead of creating a new one
    expect(mockRecipeExtractor.extractRecipeFromUrl).not.toHaveBeenCalled();
    expect(mockRecipeStore.createRecipe).not.toHaveBeenCalled();

    // Verify we added the recipe to the user's collection
    expect(mockUserStore.addRecipeToUser).toHaveBeenCalledWith('test-user-id', 'existing-id');

    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith({
      ...existingRecipe,
      message: 'Existing recipe added to your collection',
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
    mockRecipeExtractor.extractRecipeFromUrl = jest.fn().mockResolvedValue(extractedRecipe);
    mockRecipeStore.createRecipe = jest.fn().mockResolvedValue('new-id');
    mockRecipeStore.getRecipeById = jest.fn().mockResolvedValue(createdRecipe);
    mockUserStore.addRecipeToUser = jest.fn().mockResolvedValue(undefined);

    // Call create recipe
    await recipeController.createRecipe(mockReq as Request, mockRes as Response);

    // Verify URL was normalized
    expect(normalizeUrl).toHaveBeenCalledWith('https://example.com/new-recipe');

    // Verify we checked for existing recipe
    expect(mockRecipeStore.getRecipeByNormalizedLink).toHaveBeenCalledWith(normalizedUrl);

    // Verify we extracted recipe details
    expect(mockRecipeExtractor.extractRecipeFromUrl).toHaveBeenCalledWith(normalizedUrl);

    // Verify we created the recipe
    expect(mockRecipeStore.createRecipe).toHaveBeenCalled();

    // Verify we added the recipe to the user's collection
    expect(mockUserStore.addRecipeToUser).toHaveBeenCalledWith('test-user-id', 'new-id');

    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith({
      ...createdRecipe,
      message: 'Recipe created successfully',
    });
  });
});
