import { TestDatabase } from './utils/test-db';
import { RecipeStore } from '../src/models/recipe-store';
import { Recipe } from '../src/models/recipe';

describe('Recipe Store E2E Tests', () => {
  let testDb: TestDatabase;
  let recipeStore: RecipeStore;
  
  // Set up a new database for each test
  beforeEach(async () => {
    // Create a new test database with a random filename
    testDb = new TestDatabase();
    await testDb.init();
    // Initialize RecipeStore with the test database
    recipeStore = new RecipeStore(testDb.getDb());
  });
  
  // Clean up the database after each test
  afterEach(async () => {
    await testDb.cleanup();
  });
  
  // Test creating a recipe
  it('should create a recipe and generate ID', async () => {
    // Sample recipe data
    const recipe: Recipe = {
      title: 'Test Recipe',
      link: 'https://example.com/test-recipe',
      ingredients: [
        { id: 'ing1', name: 'Ingredient 1', quantity: '100', unit: 'g' },
        { id: 'ing2', name: 'Ingredient 2', quantity: '200', unit: 'ml' }
      ],
      materials: [
        { id: 'mat1', name: 'Material 1', description: 'Description 1' },
        { id: 'mat2', name: 'Material 2' }
      ],
      steps: [
        { 
          action: 'Step 1', 
          ingredients: ['ing1'],
          materials: ['mat1']
        },
        { 
          action: 'Step 2',
          ingredients: ['ing1', 'ing2'],
          materials: ['mat2']
        }
      ],
      tags: ['tag1', 'tag2'],
      cookingTime: '30 minutes',
      servings: 4
    };
    
    // Create the recipe
    const recipeId = await recipeStore.createRecipe(recipe);
    
    // Verify ID was generated
    expect(recipeId).toBeDefined();
    expect(typeof recipeId).toBe('string');
    expect(recipeId.length).toBeGreaterThan(0);
    
    // Retrieve the created recipe
    const createdRecipe = await recipeStore.getRecipeById(recipeId);
    
    // Verify recipe was created correctly
    expect(createdRecipe).toBeDefined();
    expect(createdRecipe?.title).toBe('Test Recipe');
    expect(createdRecipe?.ingredients).toHaveLength(2);
    expect(createdRecipe?.materials).toHaveLength(2);
    expect(createdRecipe?.steps).toHaveLength(2);
    expect(createdRecipe?.tags).toHaveLength(2);
    expect(createdRecipe?.cookingTime).toBe('30 minutes');
    expect(createdRecipe?.servings).toBe(4);
  });
  
  // Test searching for recipes
  it('should search for recipes by ingredient', async () => {
    // Create multiple recipes
    const recipe1: Recipe = {
      title: 'Chocolate Cake',
      link: 'https://example.com/chocolate-cake',
      ingredients: [
        { id: 'ing1', name: 'flour', quantity: '200', unit: 'g' },
        { id: 'ing2', name: 'sugar', quantity: '150', unit: 'g' },
        { id: 'ing3', name: 'chocolate', quantity: '100', unit: 'g' }
      ],
      materials: [{ id: 'mat1', name: 'mixing bowl' }],
      steps: [{ action: 'Mix ingredients', ingredients: ['ing1', 'ing2', 'ing3'], materials: ['mat1'] }],
      tags: ['dessert', 'chocolate']
    };
    
    const recipe2: Recipe = {
      title: 'Vanilla Cake',
      link: 'https://example.com/vanilla-cake',
      ingredients: [
        { id: 'ing1', name: 'flour', quantity: '200', unit: 'g' },
        { id: 'ing2', name: 'sugar', quantity: '150', unit: 'g' },
        { id: 'ing3', name: 'vanilla extract', quantity: '10', unit: 'ml' }
      ],
      materials: [{ id: 'mat1', name: 'mixing bowl' }],
      steps: [{ action: 'Mix ingredients', ingredients: ['ing1', 'ing2', 'ing3'], materials: ['mat1'] }],
      tags: ['dessert', 'vanilla']
    };
    
    // Create both recipes
    await recipeStore.createRecipe(recipe1);
    await recipeStore.createRecipe(recipe2);
    
    // Verify we have exactly the recipes we just created
    const allRecipes = await recipeStore.getAllRecipes();
    expect(allRecipes).toHaveLength(2);
    
    // Search for chocolate
    const chocolateResults = await recipeStore.searchRecipes('chocolate');
    expect(chocolateResults).toHaveLength(1);
    expect(chocolateResults[0].title).toBe('Chocolate Cake');
    
    // Search for vanilla
    const vanillaResults = await recipeStore.searchRecipes('vanilla');
    expect(vanillaResults).toHaveLength(1);
    expect(vanillaResults[0].title).toBe('Vanilla Cake');
    
    // Search for common ingredient
    const flourResults = await recipeStore.searchRecipes('flour');
    expect(flourResults).toHaveLength(2);
  });
  
  // Test updating a recipe
  it('should update a recipe', async () => {
    // Create a recipe
    const recipe: Recipe = {
      title: 'Original Title',
      link: 'https://example.com/recipe',
      ingredients: [{ id: 'ing1', name: 'ingredient', quantity: '100', unit: 'g' }],
      materials: [{ id: 'mat1', name: 'material' }],
      steps: [{ action: 'do something', ingredients: ['ing1'], materials: ['mat1'] }],
      tags: ['tag1']
    };
    
    const recipeId = await recipeStore.createRecipe(recipe);
    
    // Update the recipe
    const update: Partial<Recipe> = {
      title: 'Updated Title',
      ingredients: [
        { id: 'ing1', name: 'ingredient', quantity: '100', unit: 'g' },
        { id: 'ing2', name: 'new ingredient', quantity: '50', unit: 'ml' }
      ]
    };
    
    await recipeStore.updateRecipe(recipeId, update);
    
    // Retrieve the updated recipe
    const updatedRecipe = await recipeStore.getRecipeById(recipeId);
    
    // Verify updates
    expect(updatedRecipe).toBeDefined();
    expect(updatedRecipe?.title).toBe('Updated Title');
    expect(updatedRecipe?.ingredients).toBeDefined();
    expect(updatedRecipe?.ingredients?.length).toBe(2);
    expect(updatedRecipe?.ingredients?.[1].name).toBe('new ingredient');
  });
  
  // Test deleting a recipe
  it('should delete a recipe', async () => {
    // Create a recipe
    const recipe: Recipe = {
      title: 'Recipe to Delete',
      link: 'https://example.com/delete-me',
      ingredients: [{ id: 'ing1', name: 'ingredient', quantity: '100', unit: 'g' }],
      materials: [{ id: 'mat1', name: 'material' }],
      steps: [{ action: 'do something', ingredients: ['ing1'], materials: ['mat1'] }],
      tags: ['tag1']
    };
    
    const recipeId = await recipeStore.createRecipe(recipe);
    
    // Verify recipe exists
    const createdRecipe = await recipeStore.getRecipeById(recipeId);
    expect(createdRecipe).toBeDefined();
    
    // Delete the recipe
    await recipeStore.deleteRecipe(recipeId);
    
    // Verify recipe was deleted
    const deletedRecipe = await recipeStore.getRecipeById(recipeId);
    expect(deletedRecipe).toBeNull();
  });
}); 