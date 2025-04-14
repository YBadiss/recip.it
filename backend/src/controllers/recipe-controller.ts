import { Request, Response } from 'express';
import { RecipeStore } from '../models/recipe-store';
import { Recipe } from '../models/recipe';
import { RecipeFetcher } from '../services/recipe-fetcher';
import { normalizeUrl } from '../utils/url-normalizer';
import { UserStore } from '../models/user-store';

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

      let recipeId = '';
      let existingRecipe = null;

      // Normalize the URL to avoid duplicates
      recipeData.link = normalizeUrl(recipeData.link);

      // Check if recipe with this normalized link already exists
      existingRecipe = await this.recipeStore.getRecipeByNormalizedLink(recipeData.link);

      if (existingRecipe && existingRecipe.id) {
        // Recipe already exists, add it to the user's collection
        recipeId = existingRecipe.id;
      } else {
        // Recipe doesn't exist, extract details from URL
        try {
          const extractedRecipe = await this.recipeFetcher.extractRecipeFromUrl(recipeData.link);
          recipeData.title = extractedRecipe.title;
          recipeData.ingredients = extractedRecipe.ingredients;
          recipeData.materials = extractedRecipe.materials;
          recipeData.steps = extractedRecipe.steps;
          recipeData.tags = extractedRecipe.tags;
          recipeData.imageUrl = extractedRecipe.imageUrl;
          recipeData.cookingTime = extractedRecipe.cookingTime;
          recipeData.servings = extractedRecipe.servings;

          // Ensure all required fields are present with valid defaults
          recipeData.ingredients = recipeData.ingredients || [];
          recipeData.materials = recipeData.materials || [];
          recipeData.steps = recipeData.steps || [];
          recipeData.tags = recipeData.tags || [];

          // Create new recipe
          recipeId = await this.recipeStore.createRecipe(recipeData);
        } catch (extractError) {
          console.error('Error extracting recipe from URL:', extractError);
          res.status(400).json({
            error: 'Failed to extract recipe details from URL',
            details: extractError instanceof Error ? extractError.message : 'Unknown error',
          });
          return;
        }
      }

      if (req.user?.userId) {
        // Add the recipe to the user's collection
        await this.userStore.addRecipeToUser(req.user.userId, recipeId);
      }

      // Get the complete recipe to return
      const recipe = await this.recipeStore.getRecipeById(recipeId);

      res.status(201).json({
        ...recipe,
        message: existingRecipe
          ? 'Existing recipe added to your collection'
          : 'Recipe created successfully',
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

      try {
        // Extract recipe details from URL
        const extractedRecipe = await this.recipeFetcher.extractRecipeFromUrl(existingRecipe.link);

        // Update the recipe in the database
        const recipeData: Partial<Recipe> = {
          title: extractedRecipe.title,
          ingredients: extractedRecipe.ingredients,
          materials: extractedRecipe.materials,
          steps: extractedRecipe.steps,
          tags: extractedRecipe.tags,
          imageUrl: extractedRecipe.imageUrl,
          cookingTime: extractedRecipe.cookingTime,
          servings: extractedRecipe.servings,
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
}
