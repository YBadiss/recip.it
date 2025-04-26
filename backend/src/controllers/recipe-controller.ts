import { Request, Response } from 'express';
import { FileProcessor, RecipeFile } from '../services/file-processor';
import { RecipeService } from '../services/recipe-service';
import { Logger } from '../utils/logger';

export class RecipeController {
  private recipeService: RecipeService;
  private fileProcessor: FileProcessor;
  private logger: Logger;

  constructor(recipeService: RecipeService) {
    this.recipeService = recipeService;
    this.fileProcessor = new FileProcessor();
    this.logger = Logger.forContext('RecipeController');
  }

  // Get all recipes for the current user
  getAllRecipes = async (req: Request, res: Response): Promise<void> => {
    try {
      this.logger.info('Getting all recipes', { userId: req.user?.userId });

      const recipes = await this.recipeService.getAllRecipes(req.user?.userId);

      this.logger.info('Successfully fetched recipes', {
        count: recipes.length,
      });

      res.json({ recipes });
    } catch (error) {
      this.logger.error('Error fetching recipes', { error });
      res.status(500).json({
        error: 'Failed to fetch recipes',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // Get a single recipe by ID
  getRecipeById = async (req: Request, res: Response): Promise<void> => {
    this.logger.info('Getting recipe by ID', { recipeId: req.params.id, userId: req.user?.userId });
    try {
      const { id } = req.params;

      if (!id) {
        this.logger.info('Missing recipe ID parameter');
        res.status(400).json({ error: 'Recipe ID is required' });
        return;
      }

      const recipe = await this.recipeService.getRecipeById(id, req.user?.userId);

      if (!recipe) {
        this.logger.info('Recipe not found', { recipeId: id });
        res.status(404).json({ error: 'Recipe not found' });
        return;
      }

      this.logger.info('Successfully fetched recipe', { recipeId: id, title: recipe.title });
      res.json({ recipe });
    } catch (error) {
      this.logger.error('Error fetching recipe', { error, recipeId: req.params.id });
      res.status(500).json({
        error: 'Failed to fetch recipe',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // Create a new recipe
  createRecipeFromLink = async (req: Request, res: Response): Promise<void> => {
    this.logger.info('Creating recipe from link', {
      link: req.body.link,
      userId: req.user?.userId,
    });
    try {
      const recipeData = req.body;

      // Basic validation
      if (!recipeData.link) {
        this.logger.info('Missing recipe link in request');
        res.status(400).json({ error: 'Recipe must have a link' });
        return;
      }

      try {
        this.logger.info('Processing recipe link', { link: recipeData.link });
        const recipe = await this.recipeService.addRecipeFromLink(
          recipeData.link,
          req.user?.userId
        );

        this.logger.info('Successfully created recipe from link', {
          recipeId: recipe.id,
          title: recipe.title,
          link: recipeData.link,
        });

        res.status(200).json({ recipe });
      } catch (error) {
        this.logger.error('Error processing recipe', { error, link: recipeData.link });
        res.status(400).json({
          error: 'Failed to process recipe',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } catch (error) {
      this.logger.error('Error creating recipe', { error });
      res.status(500).json({
        error: 'Failed to create recipe',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // Re-import a recipe from its original link
  reimportRecipe = async (req: Request, res: Response): Promise<void> => {
    this.logger.info('Reimporting recipe', { recipeId: req.params.id, userId: req.user?.userId });
    try {
      const { id } = req.params;

      if (!id) {
        this.logger.info('Missing recipe ID parameter');
        res.status(400).json({ error: 'Recipe ID is required' });
        return;
      }

      const updatedRecipe = await this.recipeService.reimportRecipe(id);
      this.logger.info('Successfully reimported recipe', {
        recipeId: id,
        title: updatedRecipe.title,
      });

      res.json(updatedRecipe);
    } catch (error) {
      this.logger.error('Error reimporting recipe', { error, recipeId: req.params.id });

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
    this.logger.info('Removing recipe from user collection', {
      recipeId: req.params.id,
      userId: req.user?.userId,
    });

    try {
      const { id } = req.params;

      if (!id) {
        this.logger.info('Missing recipe ID parameter');
        res.status(400).json({ error: 'Recipe ID is required' });
        return;
      }

      if (!req.user?.userId) {
        this.logger.info('Unauthorized request - missing user ID');
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await this.recipeService.removeRecipeFromUserCollection(req.user.userId, id);
      this.logger.info('Successfully removed recipe from collection', {
        recipeId: id,
        userId: req.user.userId,
      });

      res.json({ message: 'Recipe removed from your collection' });
    } catch (error) {
      this.logger.error('Error removing recipe', {
        error,
        recipeId: req.params.id,
        userId: req.user?.userId,
      });

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
    this.logger.info('Deleting recipe', { recipeId: req.params.id, userId: req.user?.userId });
    try {
      const { id } = req.params;

      if (!id) {
        this.logger.info('Missing recipe ID parameter');
        res.status(400).json({ error: 'Recipe ID is required' });
        return;
      }

      await this.recipeService.deleteRecipe(id);
      this.logger.info('Successfully deleted recipe', { recipeId: id });

      res.json({ message: 'Recipe deleted successfully' });
    } catch (error) {
      this.logger.error('Error deleting recipe', { error, recipeId: req.params.id });

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

  // Create a recipe from uploaded file
  createRecipeFromFile = async (req: Request, res: Response): Promise<void> => {
    this.logger.info('Creating recipe from file upload', {
      filename: req.file?.originalname,
      userId: req.user?.userId,
    });

    try {
      if (!req.file) {
        this.logger.info('Missing file in request');
        res.status(400).json({ error: 'Please upload a recipe file' });
        return;
      }

      // Process file based on its mimetype
      let recipeFile: RecipeFile;

      this.logger.info('Processing uploaded file', {
        mimetype: req.file.mimetype,
        size: req.file.size,
      });

      try {
        recipeFile = await this.fileProcessor.processFile(req.file);
      } catch (error) {
        this.logger.error('Error processing file', { error, filename: req.file.originalname });
        res.status(400).json({
          error: 'Failed to process file',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
        return;
      }

      // Create recipe from processed file
      const recipe = await this.recipeService.addRecipeFromFile(recipeFile, req.user?.userId);

      this.logger.info('Successfully created recipe from file', {
        recipeId: recipe.id,
        title: recipe.title,
        filename: req.file.originalname,
      });

      res.status(201).json({ recipe });
    } catch (error) {
      this.logger.error('Error creating recipe from file', {
        error,
        filename: req.file?.originalname,
      });

      res.status(500).json({
        error: 'Failed to create recipe from file',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}
