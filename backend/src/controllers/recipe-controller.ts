import { Request, Response } from 'express';
import { RecipeStore } from '../models/recipe-store';
import { RecipeFetcher, ExtractedRecipe } from '../services/recipe-fetcher';
import { normalizeUrl } from '../utils/url-normalizer';
import { UserStore } from '../models/user-store';
import * as crypto from 'crypto';
import pdfParse from 'pdf-parse';

export class RecipeController {
  private recipeStore: RecipeStore;
  private recipeFetcher: RecipeFetcher;
  private userStore: UserStore;

  constructor(recipeStore: RecipeStore, recipeFetcher: RecipeFetcher, userStore: UserStore) {
    this.recipeStore = recipeStore;
    this.recipeFetcher = recipeFetcher;
    this.userStore = userStore;
  }

  // Get all recipes for the current user
  getAllRecipes = async (req: Request, res: Response): Promise<void> => {
    try {
      const { q } = req.query;

      // Get all recipes
      const allRecipes = await this.recipeStore.getAllRecipes(q as string | undefined);

      if (req.user?.userId) {
        // Get the list of recipe IDs this user has access to
        const userRecipeIds = await this.userStore.getUserRecipes(req.user.userId);

        // Add inUserList flag to each recipe
        const recipesWithOwnershipFlag = allRecipes.map(recipe => ({
          ...recipe,
          inUserList: recipe.id ? userRecipeIds.includes(recipe.id) : false,
        }));

        res.json(recipesWithOwnershipFlag);
      } else {
        res.json(allRecipes);
      }
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

      // Get the recipe
      const recipe = await this.recipeStore.getRecipeById(id);

      if (!recipe) {
        res.status(404).json({ error: 'Recipe not found' });
        return;
      }

      // Check if user has this recipe in their list
      const hasRecipe = req.user?.userId
        ? await this.userStore.userHasRecipe(req.user.userId, id)
        : false;

      // Return the recipe with an inUserList flag
      res.json({
        ...recipe,
        inUserList: hasRecipe,
      });
    } catch (error) {
      console.error('Error fetching recipe:', error);
      res.status(500).json({
        error: 'Failed to fetch recipe',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // Create a new recipe
  createRecipe = async (req: Request, res: Response): Promise<void> => {
    try {
      const recipeData = req.body;

      // Basic validation
      if (!recipeData.link) {
        res.status(400).json({ error: 'Recipe must have a link' });
        return;
      }

      // Normalize the URL to avoid duplicates
      const normalizedLink = normalizeUrl(recipeData.link);

      // Process the recipe (shared functionality)
      await this._processRecipe({
        link: normalizedLink,
        extractRecipe: async () => {
          return await this.recipeFetcher.extractRecipeFromUrl(normalizedLink);
        },
        userId: req.user?.userId,
        res,
      });
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

      // Get the existing recipe
      const existingRecipe = await this.recipeStore.getRecipeById(id);
      if (!existingRecipe) {
        res.status(404).json({ error: 'Recipe not found' });
        return;
      }

      // Prevent reimporting file-based recipes
      if (existingRecipe.link.startsWith('file://')) {
        res.status(400).json({ error: 'Reimporting file-based recipes is not supported' });
        return;
      }

      try {
        // Extract recipe details from URL
        const extractedRecipe = await this.recipeFetcher.extractRecipeFromUrl(existingRecipe.link);

        // Update the recipe in the database
        const recipeData = {
          title: extractedRecipe.title || 'Untitled Recipe',
          ingredients: extractedRecipe.ingredients || [],
          materials: extractedRecipe.materials || [],
          steps: extractedRecipe.steps || [],
          tags: extractedRecipe.tags || [],
          imageUrl: extractedRecipe.imageUrl || '',
          cookingTime: extractedRecipe.cookingTime || '',
          servings: extractedRecipe.servings || 0,
        };

        await this.recipeStore.updateRecipe(id, recipeData);

        // Get the updated recipe
        const updatedRecipe = await this.recipeStore.getRecipeById(id);
        res.json(updatedRecipe);
      } catch (extractError) {
        console.error('Error re-processing URL:', extractError);
        res.status(400).json({
          error: 'Failed to extract recipe details from URL',
          details: extractError instanceof Error ? extractError.message : 'Unknown error',
        });
      }
    } catch (error) {
      console.error('Error reimporting recipe:', error);
      res.status(500).json({
        error: 'Failed to reimport recipe',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
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

      // Check if user has access to this recipe
      const hasAccess = await this.userStore.userHasRecipe(req.user!.userId, id);
      if (!hasAccess) {
        res.status(404).json({ error: 'Recipe not found' });
        return;
      }

      // Remove recipe from user's collection
      await this.userStore.removeRecipeFromUser(req.user!.userId, id);

      res.json({ message: 'Recipe removed from your collection' });
    } catch (error) {
      console.error('Error removing recipe:', error);
      res.status(500).json({
        error: 'Failed to remove recipe',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
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

      // Check if the recipe exists
      const recipe = await this.recipeStore.getRecipeById(id);
      if (!recipe) {
        res.status(404).json({ error: 'Recipe not found' });
        return;
      }

      // Delete the recipe from the database
      await this.recipeStore.deleteRecipe(id);

      // Also remove the recipe from all users who have it in their collection
      // This prevents orphaned references
      await this.userStore.removeRecipeFromAllUsers(id);

      res.json({
        message: 'Recipe deleted successfully',
        recipeId: id,
      });
    } catch (error) {
      console.error('Error deleting recipe:', error);
      res.status(500).json({
        error: 'Failed to delete recipe',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // Upload a recipe from a file
  uploadRecipe = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      // Extract content based on file type
      let fileContent: string;

      if (req.file.mimetype === 'application/pdf') {
        // Process PDF file
        try {
          const pdfData = await pdfParse(req.file.buffer);
          fileContent = pdfData.text;

          // If text is too short, the PDF might be image-based or empty
          if (fileContent.length < 50) {
            res.status(400).json({
              error:
                'Unable to extract sufficient text from PDF. The file may be image-based or empty.',
            });
            return;
          }

          console.log(`Extracted ${fileContent.length} characters from PDF`);
        } catch (pdfError) {
          console.error('Error extracting text from PDF:', pdfError);
          res.status(400).json({
            error: 'Failed to parse PDF file',
            details: pdfError instanceof Error ? pdfError.message : 'Unknown error',
          });
          return;
        }
      } else if (req.file.mimetype === 'text/plain') {
        // Process TXT file - no preprocessing needed
        fileContent = req.file.buffer.toString('utf-8');

        console.log(`Loaded ${fileContent.length} characters from TXT file`);
      } else {
        res.status(400).json({ error: 'Unsupported file type' });
        return;
      }

      // Calculate MD5 hash of the file content
      const md5Hash = crypto.createHash('md5').update(fileContent).digest('hex');

      // Create the file URL
      const fileUrl = `file://upload/${md5Hash}`;

      // Process the recipe (shared functionality)
      await this._processRecipe({
        link: fileUrl,
        extractRecipe: async () => {
          // If content is too large, truncate it
          const maxContentLength = 100000; // Adjust based on LLM context limits
          const truncatedContent =
            fileContent.length > maxContentLength
              ? fileContent.substring(0, maxContentLength) + '\n[Content truncated due to length]'
              : fileContent;

          return await this.recipeFetcher.extractRecipeFromContent(
            fileUrl,
            truncatedContent,
            '', // No image URL
            `Uploaded ${req.file?.mimetype === 'application/pdf' ? 'PDF' : 'TXT'} recipe with MD5: ${md5Hash}`
          );
        },
        userId: req.user?.userId,
        res,
      });
    } catch (error) {
      console.error('Error uploading recipe:', error);
      res.status(500).json({
        error: 'Failed to upload recipe',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // Private helper method to process recipes (shared between create and upload)
  private _processRecipe = async ({
    link,
    extractRecipe,
    userId,
    res,
  }: {
    link: string;
    extractRecipe: () => Promise<ExtractedRecipe>;
    userId?: string;
    res: Response;
  }): Promise<void> => {
    let recipeId = '';
    let existingRecipe = null;

    // Check if recipe with this normalized link already exists
    existingRecipe = await this.recipeStore.getRecipeByNormalizedLink(link);

    if (existingRecipe && existingRecipe.id) {
      // Recipe already exists, add it to the user's collection
      recipeId = existingRecipe.id;

      if (userId) {
        await this.userStore.addRecipeToUser(userId, recipeId);
      }

      // Get the complete recipe to return
      const recipe = await this.recipeStore.getRecipeById(recipeId);

      res.status(200).json({
        ...recipe,
        message: 'Existing recipe added to your collection',
        inUserList: !!userId,
      });
    } else {
      // Recipe doesn't exist, extract details
      try {
        const extractedRecipe = await extractRecipe();

        // Create recipe data
        const recipeData = {
          link,
          title: extractedRecipe.title || 'Untitled Recipe',
          ingredients: extractedRecipe.ingredients || [],
          materials: extractedRecipe.materials || [],
          steps: extractedRecipe.steps || [],
          tags: extractedRecipe.tags || [],
          imageUrl: extractedRecipe.imageUrl || '',
          cookingTime: extractedRecipe.cookingTime || '',
          servings: extractedRecipe.servings || 0,
        };

        // Create new recipe
        recipeId = await this.recipeStore.createRecipe(recipeData);

        if (userId) {
          // Add the recipe to the user's collection
          await this.userStore.addRecipeToUser(userId, recipeId);
        }

        // Get the complete recipe to return
        const recipe = await this.recipeStore.getRecipeById(recipeId);

        res.status(201).json({
          ...recipe,
          message: 'Recipe created successfully',
          inUserList: !!userId,
        });
      } catch (extractError) {
        console.error('Error extracting recipe:', extractError);
        res.status(400).json({
          error: 'Failed to extract recipe details',
          details: extractError instanceof Error ? extractError.message : 'Unknown error',
        });
      }
    }
  };
}
