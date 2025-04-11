import { Request, Response } from 'express';
import * as recipeModel from '../models/recipe';
import { fetchRecipeContent, extractRecipeDetails } from '../services/openai';

// Shared function to extract recipe details from a URL
async function extractRecipeFromUrl(url: string): Promise<recipeModel.Recipe> {
  // Fetch content from the URL
  const content = await fetchRecipeContent(url);
  
  // Extract recipe details using OpenAI
  const extractedRecipe = await extractRecipeDetails(url, content);
  
  // Return a recipe object
  return {
    title: extractedRecipe.title,
    link: url,
    ingredients: extractedRecipe.ingredients,
    materials: extractedRecipe.materials,
    steps: extractedRecipe.steps,
    tags: extractedRecipe.tags
  };
}

// Get all recipes
export const getAllRecipes = async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    const recipes = await recipeModel.getAllRecipes(q as string | undefined);
    res.json(recipes);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({
      error: 'Failed to fetch recipes',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get a single recipe by ID
export const getRecipeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Recipe ID is required' });
    }
    
    const recipe = await recipeModel.getRecipeById(id);
    
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    res.json(recipe);
  } catch (error) {
    console.error('Error fetching recipe:', error);
    res.status(500).json({
      error: 'Failed to fetch recipe',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Create a new recipe
export const createRecipe = async (req: Request, res: Response) => {
  try {
    const recipeData = req.body;
    
    // Basic validation
    if (!recipeData.title && !recipeData.link) {
      return res.status(400).json({ error: 'Recipe must have either a title or a link' });
    }
    
    // If link is provided, extract recipe details from URL
    if (recipeData.link) {
      try {
        const extractedRecipe = await extractRecipeFromUrl(recipeData.link);
        recipeData.title = extractedRecipe.title;
        recipeData.ingredients = extractedRecipe.ingredients;
        recipeData.materials = extractedRecipe.materials;
        recipeData.steps = extractedRecipe.steps;
        recipeData.tags = extractedRecipe.tags;
      } catch (extractError) {
        console.error('Error extracting recipe from URL:', extractError);
        return res.status(400).json({
          error: 'Failed to extract recipe details from URL',
          details: extractError instanceof Error ? extractError.message : 'Unknown error'
        });
      }
    }
    
    // Ensure all required fields are present with valid defaults
    recipeData.ingredients = recipeData.ingredients || [];
    recipeData.materials = recipeData.materials || [];
    recipeData.steps = recipeData.steps || [];
    recipeData.tags = recipeData.tags || [];
    
    const recipeId = await recipeModel.createRecipe(recipeData);
    const recipe = await recipeModel.getRecipeById(recipeId);
    res.status(201).json(recipe);
  } catch (error) {
    console.error('Error creating recipe:', error);
    res.status(500).json({
      error: 'Failed to create recipe',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Re-import a recipe from its original link
export const reimportRecipe = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Recipe ID is required' });
    }
    
    // Get the existing recipe
    const existingRecipe = await recipeModel.getRecipeById(id);
    
    if (!existingRecipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    if (!existingRecipe.link) {
      return res.status(400).json({ error: 'Recipe has no associated link' });
    }
    
    try {
      // Extract recipe details from URL
      const extractedRecipe = await extractRecipeFromUrl(existingRecipe.link);
      
      // Update the recipe in the database
      const recipeData: Partial<recipeModel.Recipe> = {
        title: extractedRecipe.title,
        ingredients: extractedRecipe.ingredients,
        materials: extractedRecipe.materials,
        steps: extractedRecipe.steps,
        tags: extractedRecipe.tags
      };
      
      await recipeModel.updateRecipe(id, recipeData);
      
      // Get the updated recipe
      const updatedRecipe = await recipeModel.getRecipeById(id);
      res.json(updatedRecipe);
    } catch (extractError) {
      console.error('Error re-processing URL:', extractError);
      res.status(400).json({
        error: 'Failed to extract recipe details from URL',
        details: extractError instanceof Error ? extractError.message : 'Unknown error'
      });
    }
  } catch (error) {
    console.error('Error reimporting recipe:', error);
    res.status(500).json({
      error: 'Failed to reimport recipe',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Delete a recipe
export const deleteRecipe = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Recipe ID is required' });
    }
    
    await recipeModel.deleteRecipe(id);
    res.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    res.status(500).json({
      error: 'Failed to delete recipe',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Search recipes
export const searchRecipes = async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const recipes = await recipeModel.searchRecipes(q);
    res.json(recipes);
  } catch (error) {
    console.error('Error searching recipes:', error);
    res.status(500).json({
      error: 'Failed to search recipes',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update a recipe
export const updateRecipe = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const recipeData = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'Recipe ID is required' });
    }
    
    await recipeModel.updateRecipe(id, recipeData);
    res.json({ message: 'Recipe updated successfully' });
  } catch (error) {
    console.error('Error updating recipe:', error);
    res.status(500).json({
      error: 'Failed to update recipe',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
