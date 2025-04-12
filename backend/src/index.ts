import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { createRecipeRouter } from './routes/recipe.routes';
import { RecipeController } from './controllers/recipe-controller';
import { RecipeStore } from './models/recipe-store';
import { RecipeFetcher } from './services/recipe-fetcher';
import { initDatabase, getDatabase } from './db/migrate';
import OpenAI from 'openai';
import axios from 'axios';
import { Config } from './config';

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

// Set up dependency injection
const recipeStore = new RecipeStore(db);
const recipeFetcher = new RecipeFetcher(openai, axios);
const recipeController = new RecipeController(recipeStore, recipeFetcher);
const recipeRouter = createRecipeRouter(recipeController);

// Middleware
app.use(
  cors({
    origin: Config.CORS_ORIGIN,
  })
);
app.use(express.json());

// Routes
app.use('/recipes', recipeRouter);

// Root route for API health check
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Recipe API is running',
    endpoints: {
      getRecipes: 'GET /recipes',
      getRecipeById: 'GET /recipes/:id',
      createRecipe: 'POST /recipes',
      reimportRecipe: 'POST /recipes/:id/import',
      updateRecipe: 'PUT /recipes/:id',
      deleteRecipe: 'DELETE /recipes/:id',
    },
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
  console.log(`API documentation available at http://localhost:${PORT}/`);
});
