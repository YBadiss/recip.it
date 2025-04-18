import { Request, Response } from 'express';
import { FileProcessor, RecipeFile } from '../services/file-processor';
import { RecipeService } from '../services/recipe-service';

export class RecipeController {
  private recipeService: RecipeService;
  private fileProcessor: FileProcessor;

  constructor(recipeService: RecipeService) {
    this.recipeService = recipeService;
    this.fileProcessor = new FileProcessor();
  }

  // Get all recipes for the current user
  getAllRecipes = async (req: Request, res: Response): Promise<void> => {
    try {
      const { q } = req.query;
      const recipes = await this.recipeService.getAllRecipes({
        query: q as string | undefined,
        userId: req.user?.userId,
      });

      res.json({ recipes });
    } catch (error) {
      console.error('Error fetching recipes:', error);
      res.status(500).json({
        error: 'Failed to fetch recipes',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // Get a single recipe by ID
  getRecipeById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ error: 'Recipe ID is required' });
        return;
      }

      const recipe = await this.recipeService.getRecipeById(id, req.user?.userId);

      if (!recipe) {
        res.status(404).json({ error: 'Recipe not found' });
        return;
      }

      res.json({ recipe });
    } catch (error) {
      console.error('Error fetching recipe:', error);
      res.status(500).json({
        error: 'Failed to fetch recipe',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // Create a new recipe
  createRecipeFromLink = async (req: Request, res: Response): Promise<void> => {
    try {
      const recipeData = req.body;

      // Basic validation
      if (!recipeData.link) {
        res.status(400).json({ error: 'Recipe must have a link' });
        return;
      }

      try {
        const recipe = await this.recipeService.addRecipeFromLink(
          recipeData.link,
          req.user?.userId
        );

        res.status(200).json({ recipe });
      } catch (error) {
        console.error('Error processing recipe:', error);
        res.status(400).json({
          error: 'Failed to process recipe',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } catch (error) {
      console.error('Error creating recipe:', error);
      res.status(500).json({
        error: 'Failed to create recipe',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // Re-import a recipe from its original link
  reimportRecipe = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ error: 'Recipe ID is required' });
        return;
      }

      const updatedRecipe = await this.recipeService.reimportRecipe(id);
      res.json(updatedRecipe);
    } catch (error) {
      console.error('Error reimporting recipe:', error);

      if (
        error instanceof Error &&
        (error.message === 'Recipe not found' ||
          error.message === 'Reimporting file-based recipes is not supported')
      ) {
        res.status(400).json({
          error: error.message,
        });
      } else {
        res.status(500).json({
          error: 'Failed to reimport recipe',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  };

  // Remove a recipe from user's collection
  removeRecipe = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ error: 'Recipe ID is required' });
        return;
      }

      if (!req.user?.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await this.recipeService.removeRecipeFromUserCollection(req.user.userId, id);
      res.json({ message: 'Recipe removed from your collection' });
    } catch (error) {
      console.error('Error removing recipe:', error);

      if (error instanceof Error && error.message === 'Recipe not found in user collection') {
        res.status(404).json({ error: 'Recipe not found' });
      } else {
        res.status(500).json({
          error: 'Failed to remove recipe',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  };

  // Delete a recipe completely from the database
  deleteRecipe = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ error: 'Recipe ID is required' });
        return;
      }

      const deletedId = await this.recipeService.deleteRecipe(id);
      res.json({
        message: 'Recipe deleted successfully',
        recipeId: deletedId,
      });
    } catch (error) {
      console.error('Error deleting recipe:', error);

      if (error instanceof Error && error.message === 'Recipe not found') {
        res.status(404).json({ error: 'Recipe not found' });
      } else {
        res.status(500).json({
          error: 'Failed to delete recipe',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  };

  // Upload a recipe from a file
  createRecipeFromFile = async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    let processedFile: RecipeFile;
    try {
      // Process the uploaded file
      processedFile = await this.fileProcessor.processFile(req.file);
    } catch (fileError) {
      res.status(400).json({
        error: fileError instanceof Error ? fileError.message : 'Error processing file',
      });
      return;
    }

    try {
      const recipe = await this.recipeService.addRecipeFromFile(processedFile, req.user?.userId);

      res.status(200).json({ recipe });
    } catch (error) {
      console.error('Error processing recipe:', error);
      res.status(400).json({
        error: 'Failed to process recipe',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}
