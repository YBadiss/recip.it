import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import recipeRoutes from './routes/recipe.routes';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Ensure the data directory exists
const dbPath = process.env.DB_PATH || './data/recipes.db';
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/recipes', recipeRoutes);

// Root route for API health check
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Recipe API is running',
    endpoints: {
      getRecipes: 'GET /recipes',
      getRecipeById: 'GET /recipes/:id',
      createRecipe: 'POST /recipes',
      reimportRecipe: 'POST /recipes/:id/import'
    }
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
  console.log(`API documentation available at http://localhost:${PORT}/`);
}); 