import { Router } from 'express';
import { RecipeController } from '../controllers/recipe-controller';
import { AuthMiddleware } from '../middleware/auth-middleware';

export const createRecipeRouter = (
  recipeController: RecipeController,
  authMiddleware: AuthMiddleware
): Router => {
  const router = Router();

  // Public routes
  // GET /recipes - Get all recipes with optional search
  router.get('/', authMiddleware.tryAuthenticate, recipeController.getAllRecipes);

  // GET /recipes/:id - Get a specific recipe by ID
  router.get('/:id', authMiddleware.tryAuthenticate, recipeController.getRecipeById);

  // Protected routes
  // POST /recipes/:id/remove - Remove a specific recipe by ID from user's collection
  router.post(
    '/:id/remove',
    authMiddleware.authenticate,
    authMiddleware.authorize('POST:/recipes/:id/remove'),
    recipeController.removeRecipe
  );

  // POST /recipes - Create a new recipe from a URL
  router.post(
    '/',
    authMiddleware.authenticate,
    authMiddleware.authorize('POST:/recipes'),
    recipeController.createRecipe
  );

  // POST /recipes/:id/reimport - Re-import a recipe from its original URL
  router.post(
    '/:id/reimport',
    authMiddleware.authenticate,
    authMiddleware.authorize('POST:/recipes/:id/reimport'),
    recipeController.reimportRecipe
  );

  return router;
};
