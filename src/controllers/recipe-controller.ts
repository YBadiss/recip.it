import { Request, Response } from 'express';
import { RecipeStore } from '../models/recipe-store';
import { Recipe } from '../models/recipe';
import { RecipeFetcher } from '../services/recipe-fetcher';

export class RecipeController {
  private recipeStore: RecipeStore;
  private recipeFetcher: RecipeFetcher;

  constructor(recipeStore: RecipeStore, recipeFetcher: RecipeFetcher) {
    this.recipeStore = recipeStore;
    this.recipeFetcher = recipeFetcher;
  }

  // Getter for recipeStore (for testing)
  getRecipeStore(): RecipeStore {
    return this.recipeStore;
  }

  // Getter for recipeFetcher (for testing)
  getRecipeFetcher(): RecipeFetcher {
    return this.recipeFetcher;
  }

  // Get all recipes
  getAllRecipes = async (req: Request, res: Response): Promise<void> => {
    try {
      const { q } = req.query;
      const recipes = await this.recipeStore.getAllRecipes(q as string | undefined);
      res.json(recipes);
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

      const recipe = await this.recipeStore.getRecipeById(id);

      if (!recipe) {
        res.status(404).json({ error: 'Recipe not found' });
        return;
      }

      res.json(recipe);
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
      if (!recipeData.title && !recipeData.link) {
        res.status(400).json({ error: 'Recipe must have either a title or a link' });
        return;
      }

      // If link is provided, extract recipe details from URL
      if (recipeData.link) {
        try {
          const extractedRecipe = await this.recipeFetcher.extractRecipeFromUrl(recipeData.link);
          recipeData.title = extractedRecipe.title;
          recipeData.ingredients = extractedRecipe.ingredients;
          recipeData.materials = extractedRecipe.materials;
          recipeData.steps = extractedRecipe.steps;
          recipeData.tags = extractedRecipe.tags;
        } catch (extractError) {
          console.error('Error extracting recipe from URL:', extractError);
          res.status(400).json({
            error: 'Failed to extract recipe details from URL',
            details: extractError instanceof Error ? extractError.message : 'Unknown error',
          });
          return;
        }
      }

      // Ensure all required fields are present with valid defaults
      recipeData.ingredients = recipeData.ingredients || [];
      recipeData.materials = recipeData.materials || [];
      recipeData.steps = recipeData.steps || [];
      recipeData.tags = recipeData.tags || [];

      const recipeId = await this.recipeStore.createRecipe(recipeData);
      const recipe = await this.recipeStore.getRecipeById(recipeId);
      res.status(201).json(recipe);
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

      if (!existingRecipe.link) {
        res.status(400).json({ error: 'Recipe has no associated link' });
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

  // Delete a recipe
  deleteRecipe = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ error: 'Recipe ID is required' });
        return;
      }

      await this.recipeStore.deleteRecipe(id);
      res.json({ message: 'Recipe deleted successfully' });
    } catch (error) {
      console.error('Error deleting recipe:', error);
      res.status(500).json({
        error: 'Failed to delete recipe',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // Search recipes
  searchRecipes = async (req: Request, res: Response): Promise<void> => {
    try {
      const { q } = req.query;

      if (!q || typeof q !== 'string') {
        res.status(400).json({ error: 'Search query is required' });
        return;
      }

      const recipes = await this.recipeStore.searchRecipes(q);
      res.json(recipes);
    } catch (error) {
      console.error('Error searching recipes:', error);
      res.status(500).json({
        error: 'Failed to search recipes',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // Update a recipe
  updateRecipe = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const recipeData = req.body;

      if (!id) {
        res.status(400).json({ error: 'Recipe ID is required' });
        return;
      }

      await this.recipeStore.updateRecipe(id, recipeData);
      const updatedRecipe = await this.recipeStore.getRecipeById(id);
      res.json(updatedRecipe);
    } catch (error) {
      console.error('Error updating recipe:', error);
      res.status(500).json({
        error: 'Failed to update recipe',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
} 