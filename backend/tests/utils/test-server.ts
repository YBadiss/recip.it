import express from 'express';
import cors from 'cors';
import { Express } from 'express';
import { TestDatabase } from './test-db';
import { RecipeStore } from '../../src/models/recipe-store';
import { RecipeFetcher } from '../../src/services/recipe-fetcher';
import { RecipeController } from '../../src/controllers/recipe-controller';
import { createRecipeRouter } from '../../src/routes/recipe.routes';
import OpenAI from 'openai';
import axios from 'axios';
import { Config } from '../../src/config';

// Test server utility
export class TestServer {
  private app: Express;
  private recipeController: RecipeController;

  constructor(testDb: TestDatabase, mockRecipeFetcher?: RecipeFetcher) {
    this.app = express();

    // Configure middleware
    this.app.use(cors());
    this.app.use(express.json());
    
    // Set up the recipe store
    const recipeStore = new RecipeStore(testDb.getDb());
    
    // Set up the recipe fetcher (use mock if provided)
    const recipeFetcher = mockRecipeFetcher || createDefaultRecipeFetcher();
    
    // Create the recipe controller
    this.recipeController = new RecipeController(recipeStore, recipeFetcher);
    
    // Create and configure the recipe router
    const recipeRouter = createRecipeRouter(this.recipeController);

    // Configure routes
    this.app.use('/api/recipes', recipeRouter);

    // Add test routes
    this.app.get('/health', (_, res) => res.json({ status: 'ok' }));
  }

  // Get the Express app for testing
  getApp(): Express {
    return this.app;
  }
  
  // Get the recipe controller for testing
  getRecipeController(): RecipeController {
    return this.recipeController;
  }
}

// Helper function to create a default recipe fetcher
function createDefaultRecipeFetcher(): RecipeFetcher {
  const openai = new OpenAI({
    apiKey: Config.OPENAI_API_KEY,
  });
  return new RecipeFetcher(openai, axios);
} 