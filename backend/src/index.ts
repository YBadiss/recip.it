import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import { createRecipeRouter } from './routes/recipe.routes';
import { createUserRouter } from './routes/user.routes';
import { RecipeController } from './controllers/recipe-controller';
import { UserController } from './controllers/user-controller';
import { RecipeStore } from './models/recipe-store';
import { UserStore } from './models/user-store';
import { RecipeExtractor } from './services/recipe-extractor';
import { AuthService } from './services/auth-service';
import { AuthMiddleware } from './middleware/auth-middleware';
import { LoggingMiddleware } from './middleware/logging-middleware';
import { initDatabase, getDatabase } from './db/migrate';
import OpenAI from 'openai';
import { Config } from './config';
import { YouTubeContentFetcher, WebContentFetcher } from './services/content-fetcher';
import { RecipeService } from './services/recipe-service';
// import { VideoService } from './services/media/video-service';

// Create Express app
const app = express();
const PORT = Config.PORT;

// Ensure the data directory exists
const dbPath = Config.DB_PATH;
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Initialize the database
initDatabase(dbPath)
  .then(() => {
    console.log('Database initialized successfully');
  })
  .catch(err => {
    console.error('Database initialization failed:', err);
    process.exit(1);
  });

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: Config.OPENAI_API_KEY,
});

// Get database connection
const db = getDatabase(dbPath);

// Import content fetchers
const youtubeFetcher = new YouTubeContentFetcher();
const webFetcher = new WebContentFetcher();

// Set up dependency injection
const recipeStore = new RecipeStore(db);
const userStore = new UserStore(db);
const recipeExtractor = new RecipeExtractor(openai, [youtubeFetcher, webFetcher]);
const authService = new AuthService();
const authMiddleware = new AuthMiddleware(authService);
const loggingMiddleware = new LoggingMiddleware();
const userController = new UserController(userStore, authService);
const recipeService = new RecipeService(recipeStore, userStore, recipeExtractor);
const recipeController = new RecipeController(recipeService);
// const videoService = new VideoService(Config.IMGUR_CLIENT_ID);
// const metaService = new MetaService(recipeService, videoService);
// const metaWebhookController = new MetaWebhookController(metaService);
const recipeRouter = createRecipeRouter(recipeController, authMiddleware);
const userRouter = createUserRouter(userController, authMiddleware);
// const webhookRouter = createWebhookRouter(metaWebhookController);

// Middleware
app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = Config.CORS_ORIGIN;

      // Allow requests with no origin (like mobile apps, curl requests, etc.)
      if (!origin) return callback(null, true);

      // If wildcard is set, allow all origins but make sure credentials work properly
      if (allowedOrigins === '*') {
        // For wildcard origins with credentials: true, we need to specify the exact origin
        return callback(null, origin);
      }

      // Check if the origin is in the allowed origins list
      if (typeof allowedOrigins === 'string') {
        return callback(null, allowedOrigins === origin ? origin : false);
      }

      // Check if the origin is in the array of allowed origins
      if (Array.isArray(allowedOrigins) && allowedOrigins.indexOf(origin) !== -1) {
        return callback(null, origin);
      }

      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true, // Allow cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Add request/response logging middleware
app.use(loggingMiddleware.logRequest);

// Define interface for request with rawBody
interface RequestWithRawBody extends Request {
  rawBody: Buffer;
}

// Add raw body parsing middleware before JSON parsing
app.use(
  express.json({
    verify: (req: Request, res: Response, buf: Buffer) => {
      // Store the raw body for signature verification
      (req as RequestWithRawBody).rawBody = buf;
    },
  })
);
app.use(cookieParser()); // Parse cookies

// Routes
app.use('/recipes', recipeRouter);
app.use('/users', userRouter);
app.use('/webhooks', webhookRouter);
app.use('/test', testRouter);

// Root route for API health check
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Recipe API is running',
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
  console.log(`API documentation available at http://localhost:${PORT}/`);
});
