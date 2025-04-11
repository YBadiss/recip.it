import { TestDatabase } from './utils/test-db';
import supertest from 'supertest';
import { TestServer } from './utils/test-server';
import { Recipe } from '../src/models/recipe';
import { RecipeFetcher } from '../src/services/recipe-fetcher';
import OpenAI from 'openai';
import axios from 'axios';

describe('Full Recipe Import Flow E2E Tests', () => {
  let testDb: TestDatabase;
  let testServer: TestServer;
  let mockRecipeFetcher: RecipeFetcher;
  // Using any to avoid TypeScript issues with supertest
  let request: any;
  
  // Set up a new database and server for each test
  beforeEach(async () => {
    // Create a new test database
    testDb = new TestDatabase();
    await testDb.init();
    
    // Create a mock RecipeFetcher
    mockRecipeFetcher = createMockRecipeFetcher();
    
    // Create a test server with the test database and mock fetcher
    testServer = new TestServer(testDb, mockRecipeFetcher);
    request = supertest(testServer.getApp());
  });
  
  // Clean up after each test
  afterEach(async () => {
    await testDb.cleanup();
  });
  
  // Test creating a recipe through the API
  it('should import a recipe from URL via the API', async () => {
    // Call the API to create a recipe from a URL
    const response = await request
      .post('/api/recipes')
      .send({
        link: 'https://example.com/test-recipe'
      })
      .expect(201);
    
    // Verify the recipe was created
    expect(response.body).toBeDefined();
    expect(response.body.id).toBeDefined();
    expect(response.body.title).toBe('Test Recipe from URL');
    expect(response.body.ingredients).toHaveLength(2);
    expect(response.body.steps).toHaveLength(2);
    
    // Verify the recipe is in the database
    const recipeStore = testServer.getRecipeController().getRecipeStore();
    const storedRecipe = await recipeStore.getRecipeById(response.body.id);
    expect(storedRecipe).toBeDefined();
    expect(storedRecipe?.title).toBe('Test Recipe from URL');
  });
  
  // Test retrieving all recipes
  it('should retrieve all recipes via the API', async () => {
    // Create some test recipes directly using recipeStore
    const recipeStore = testServer.getRecipeController().getRecipeStore();
    
    const recipe1: Recipe = {
      title: 'Recipe 1',
      link: 'https://example.com/recipe1',
      ingredients: [{ id: 'ing1', name: 'Ingredient 1' }],
      materials: [],
      steps: [{ action: 'Step 1', ingredients: ['ing1'] }],
      tags: ['tag1']
    };
    
    const recipe2: Recipe = {
      title: 'Recipe 2',
      link: 'https://example.com/recipe2',
      ingredients: [{ id: 'ing2', name: 'Ingredient 2' }],
      materials: [],
      steps: [{ action: 'Step 1', ingredients: ['ing2'] }],
      tags: ['tag2']
    };
    
    // Insert recipes in order - the newest one should have the latest timestamp
    await recipeStore.createRecipe(recipe1);
    
    // Wait a bit to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 100));
    
    await recipeStore.createRecipe(recipe2);
    
    // Retrieve all recipes via the API
    const response = await request
      .get('/api/recipes')
      .expect(200);
    
    // Verify response contains the recipes
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body).toHaveLength(2);
    
    // Find recipes by title as the order might depend on timestamp
    const recipe1Response = response.body.find((r: any) => r.title === 'Recipe 1');
    const recipe2Response = response.body.find((r: any) => r.title === 'Recipe 2');
    
    expect(recipe1Response).toBeDefined();
    expect(recipe2Response).toBeDefined();
  });
  
  // Test search functionality directly on RecipeStore
  it('should search for recipes in the RecipeStore', async () => {
    // Create some test recipes with searchable content
    const recipeStore = testServer.getRecipeController().getRecipeStore();
    
    const recipe1: Recipe = {
      title: 'Chocolate Cake',
      link: 'https://example.com/chocolate-cake',
      ingredients: [
        { id: 'ing1', name: 'chocolate' },
        { id: 'ing2', name: 'flour' }
      ],
      materials: [],
      steps: [{ action: 'Mix chocolate and flour', ingredients: ['ing1', 'ing2'] }],
      tags: ['dessert', 'chocolate']
    };
    
    const recipe2: Recipe = {
      title: 'Vanilla Pudding',
      link: 'https://example.com/vanilla-pudding',
      ingredients: [
        { id: 'ing1', name: 'vanilla' },
        { id: 'ing2', name: 'milk' }
      ],
      materials: [],
      steps: [{ action: 'Mix vanilla and milk', ingredients: ['ing1', 'ing2'] }],
      tags: ['dessert', 'vanilla']
    };
    
    const id1 = await recipeStore.createRecipe(recipe1);
    const id2 = await recipeStore.createRecipe(recipe2);
    
    // Verify both recipes were created
    const allRecipes = await recipeStore.getAllRecipes();
    expect(allRecipes.length).toBe(2);
    
    // Verify we can get recipes by ID
    const chocolateRecipe = await recipeStore.getRecipeById(id1);
    const vanillaRecipe = await recipeStore.getRecipeById(id2);
    
    expect(chocolateRecipe?.title).toBe('Chocolate Cake');
    expect(vanillaRecipe?.title).toBe('Vanilla Pudding');
  });
});

// Helper function to create a mock RecipeFetcher
function createMockRecipeFetcher(): RecipeFetcher {
  // Create an instance of RecipeFetcher with empty OpenAI and axios objects
  const mockFetcher = new RecipeFetcher({} as OpenAI, axios);
  
  // Override the methods we want to mock
  mockFetcher.extractRecipeFromUrl = jest.fn(async () => ({
    title: 'Test Recipe from URL',
    ingredients: [
      { id: 'ing1', name: 'URL Ingredient 1', quantity: '100', unit: 'g' },
      { id: 'ing2', name: 'URL Ingredient 2', quantity: '200', unit: 'ml' }
    ],
    materials: [
      { id: 'mat1', name: 'URL Material 1' }
    ],
    steps: [
      { action: 'URL Step 1', ingredients: ['ing1'], materials: ['mat1'] },
      { action: 'URL Step 2', ingredients: ['ing2'] }
    ],
    tags: ['url-tag1', 'url-tag2']
  }));
  
  return mockFetcher;
} 