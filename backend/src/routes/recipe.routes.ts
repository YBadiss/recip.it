import { Router, Request } from 'express';
import { RecipeController } from '../controllers/recipe-controller';
import { AuthMiddleware } from '../middleware/auth-middleware';
import multer from 'multer';

// Extend the Express Request type to include fileValidationError
interface FileUploadRequest extends Request {
  fileValidationError?: string;
}

export const createRecipeRouter = (
  recipeController: RecipeController,
  authMiddleware: AuthMiddleware
): Router => {
  const router = Router();

  // Configure multer for memory storage
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
  });

  // Public routes
  // GET /recipes - Get all recipes with optional search
  router.get('/', authMiddleware.tryAuthenticate, recipeController.getAllRecipes);

  // GET /recipes/:id - Get a specific recipe by ID
  router.get('/:id', authMiddleware.tryAuthenticate, recipeController.getRecipeById);

  // POST /recipes - Create a new recipe from a URL
  router.post('/', authMiddleware.tryAuthenticate, recipeController.createRecipe);

  // POST /recipes/upload - Upload a recipe file
  router.post(
    '/upload',
    authMiddleware.tryAuthenticate,
    (req: FileUploadRequest, res, next) => {
      upload.single('recipe')(req, res, err => {
        if (err instanceof multer.MulterError) {
          // A Multer error occurred when uploading
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              error: 'File too large. Maximum size is 10MB.',
            });
          }
          return res.status(400).json({
            error: `Upload error: ${err.message}`,
          });
        } else if (err) {
          // An unknown error occurred
          return res.status(500).json({
            error: `Unknown upload error: ${err.message}`,
          });
        } else if (req.fileValidationError) {
          // File validation error
          return res.status(400).json({
            error: req.fileValidationError,
          });
        } else if (!req.file) {
          // No file was provided
          return res.status(400).json({
            error: 'Please upload a PDF or TXT file',
          });
        }

        // If everything is OK, proceed to the controller
        next();
      });
    },
    recipeController.uploadRecipe
  );

  // Protected routes
  // POST /recipes/:id/remove - Remove a specific recipe by ID from user's collection
  router.post(
    '/:id/remove',
    authMiddleware.authenticate,
    authMiddleware.authorize('POST:/recipes/:id/remove'),
    recipeController.removeRecipe
  );

  // POST /recipes/:id/reimport - Re-import a recipe from its original URL
  router.post(
    '/:id/reimport',
    authMiddleware.authenticate,
    authMiddleware.authorize('POST:/recipes/:id/reimport'),
    recipeController.reimportRecipe
  );

  // DELETE /recipes/:id - Completely delete a recipe from the database
  router.delete(
    '/:id',
    authMiddleware.authenticate,
    authMiddleware.authorize('DELETE:/recipes/:id'),
    recipeController.deleteRecipe
  );

  return router;
};
