import { Router } from 'express';
import { RecipeController } from '../controllers/recipe-controller';

export const createRecipeRouter = (recipeController: RecipeController): Router => {
  const router = Router();

  // GET /recipes - Get all recipes with optional search
  router.get('/', recipeController.getAllRecipes);

  // GET /recipes/:id - Get a specific recipe by ID
  router.get('/:id', recipeController.getRecipeById);

  // DELETE /recipes/:id - Delete a specific recipe by ID
  router.delete('/:id', recipeController.deleteRecipe);

  // POST /recipes - Create a new recipe from a URL
  router.post('/', recipeController.createRecipe);

  // POST /recipes/:id/import - Re-import a recipe from its original URL
  router.post('/:id/import', recipeController.reimportRecipe);

  // PUT /recipes/:id - Update a recipe
  router.put('/:id', recipeController.updateRecipe);

  return router;
};
