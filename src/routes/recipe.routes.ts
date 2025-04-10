import { Router } from 'express';
import * as recipeController from '../controllers/recipe.controller';

const router = Router();

// GET /recipes - Get all recipes with optional search
router.get('/', recipeController.getAllRecipes);

// GET /recipes/:id - Get a specific recipe by ID
router.get('/:id', recipeController.getRecipeById);

// POST /recipes - Create a new recipe from a URL
router.post('/', recipeController.createRecipe);

// POST /recipes/:id/import - Re-import a recipe from its original URL
router.post('/:id/import', recipeController.reimportRecipe);

export default router; 