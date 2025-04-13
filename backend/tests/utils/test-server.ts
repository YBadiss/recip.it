import express from 'express';
import cors from 'cors';
import { Express } from 'express';
import { TestDatabase } from './test-db';
import { RecipeStore } from '../../src/models/recipe-store';
import { RecipeFetcher } from '../../src/services/recipe-fetcher';
import { RecipeController } from '../../src/controllers/recipe-controller';
import { createRecipeRouter } from '../../src/routes/recipe.routes';
import { AuthMiddleware } from '../../src/middleware/auth-middleware';
import { AuthService } from '../../src/services/auth-service';
import { UserStore } from '../../src/models/user-store';
import OpenAI from 'openai';
import axios from 'axios';
import { Config } from '../../src/config';
import { YouTubeContentFetcher, WebContentFetcher } from '../../src/services/content-fetcher';

// Test server utility
export class TestServer {
  private app: Express;
  private recipeController: RecipeController;
  private userStore: UserStore;
  private authMiddleware: AuthMiddleware;

  constructor(testDb: TestDatabase, mockRecipeFetcher?: RecipeFetcher) {
    this.app = express();

    // Configure middleware
    this.app.use(cors());
    this.app.use(express.json());
    
    // Set up stores
    const recipeStore = new RecipeStore(testDb.getDb());
    this.userStore = new UserStore(testDb.getDb());
    
    // Set up auth service and middleware
    const authService = new AuthService();
    this.authMiddleware = new AuthMiddleware(authService);
    
    // Set up the recipe fetcher (use mock if provided)
    const recipeFetcher = mockRecipeFetcher || createDefaultRecipeFetcher();
    
    // Create the recipe controller
    this.recipeController = new RecipeController(recipeStore, recipeFetcher, this.userStore);
    
    // Create and configure the recipe router
    const recipeRouter = createRecipeRouter(this.recipeController, this.authMiddleware);

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
  
  // Create content fetchers
  const youtubeFetcher = new YouTubeContentFetcher();
  const webFetcher = new WebContentFetcher();
  
  return new RecipeFetcher(openai, [youtubeFetcher, webFetcher]);
} 