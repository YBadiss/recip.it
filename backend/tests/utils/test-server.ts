import express from 'express';
import cors from 'cors';
import { Express, Request, Response, NextFunction } from 'express';
import { TestDatabase } from './test-db';
import { RecipeStore } from '../../src/models/recipe-store';
import { RecipeExtractor } from '../../src/services/recipe-extractor';
import { RecipeController } from '../../src/controllers/recipe-controller';
import { createRecipeRouter } from '../../src/routes/recipe.routes';
import { AuthMiddleware } from '../../src/middleware/auth-middleware';
import { AuthService } from '../../src/services/auth-service';
import { UserStore } from '../../src/models/user-store';
import OpenAI from 'openai';
import { Config } from '../../src/config';
import { YouTubeContentFetcher, WebContentFetcher } from '../../src/services/content-fetcher';

// Test server utility
export class TestServer {
  private app: Express;
  private recipeController: RecipeController;
  private userStore: UserStore;
  private authMiddleware: AuthMiddleware;
  private authService: AuthService;
  private testUserId: string = 'test-user-id';
  private recipeStore: RecipeStore;

  constructor(testDb: TestDatabase, mockRecipeExtractor?: RecipeExtractor) {
    this.app = express();

    // Configure middleware
    this.app.use(cors());
    this.app.use(express.json());

    // Set up stores
    this.recipeStore = new RecipeStore(testDb.getDb());
    this.userStore = new UserStore(testDb.getDb());

    // Set up auth service and middleware
    this.authService = new AuthService();
    this.authMiddleware = new AuthMiddleware(this.authService);

    // Mock the auth middleware for testing
    this.mockAuthMiddleware();

    // Set up the recipe extractor (use mock if provided)
    const recipeExtractor = mockRecipeExtractor || createDefaultRecipeExtractor();

    // Create the recipe controller
    this.recipeController = new RecipeController(this.recipeStore, recipeExtractor, this.userStore);

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

  // Get the recipe store for testing
  getRecipeStore(): RecipeStore {
    return this.recipeStore;
  }

  // Get the user store for testing
  getUserStore(): UserStore {
    return this.userStore;
  }

  // Get the test user ID
  getTestUserId(): string {
    return this.testUserId;
  }

  // Setup a test user in the database
  async setupTestUser(): Promise<void> {
    // Create a test user if it doesn't exist
    try {
      await this.userStore.createUser(
        'test@example.com', // username (email)
        'password123', // password
        ['all'] // authorizedEndpoints
      );
    } catch (error) {
      // User might already exist, that's fine for testing
      console.log('Test user already exists or error creating user:', error);
    }
  }

  // Mock the authentication middleware for testing
  private mockAuthMiddleware(): void {
    // Override the authenticate method to skip actual token verification
    this.authMiddleware.authenticate = jest.fn().mockImplementation((req, res, next) => {
      // Add a test user to the request
      req.user = {
        userId: this.testUserId,
        username: 'test@example.com',
        authorizedEndpoints: ['all'],
      };
      next();
    });

    // Mock tryAuthenticate method as well
    this.authMiddleware.tryAuthenticate = jest.fn().mockImplementation((req, res, next) => {
      req.user = {
        userId: this.testUserId,
        username: 'test@example.com',
        authorizedEndpoints: ['all'],
      };
      next();
    });

    // Mock authorize method
    this.authMiddleware.authorize = jest.fn().mockImplementation(_endpoint => {
      // Skip authorization check and allow all endpoints
      return (req: Request, res: Response, next: NextFunction) => {
        req.user = {
          userId: this.testUserId,
          username: 'test@example.com',
          authorizedEndpoints: ['all'],
        };
        next();
      };
    });
  }
}

// Helper function to create a default recipe extractor
function createDefaultRecipeExtractor(): RecipeExtractor {
  const openai = new OpenAI({
    apiKey: Config.OPENAI_API_KEY,
  });

  // Create content fetchers
  const youtubeFetcher = new YouTubeContentFetcher();
  const webFetcher = new WebContentFetcher();

  return new RecipeExtractor(openai, [youtubeFetcher, webFetcher]);
}
