import { Request, Response } from 'express';
import * as recipeModel from '../models/recipe';
import { fetchRecipeContent, extractRecipeDetails } from '../services/openai';

// Get all recipes with optional search
export const getAllRecipes = async (req: Request, res: Response) => {
  try {
    const searchTerm = req.query.search as string | undefined;
    const recipes = await recipeModel.getAllRecipes(searchTerm);
    res.json(recipes);
  } catch (error) {
    console.error('Error getting recipes:', error);
    res.status(500).json({
      error: 'Failed to retrieve recipes',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get a single recipe by ID
export const getRecipeById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid recipe ID' });
    }
    
    const recipe = await recipeModel.getRecipeById(id);
    
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    res.json(recipe);
  } catch (error) {
    console.error('Error getting recipe by ID:', error);
    res.status(500).json({
      error: 'Failed to retrieve recipe',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Create a new recipe from a URL
export const createRecipe = async (req: Request, res: Response) => {
  try {
    const { link } = req.body;
    
    if (!link) {
      return res.status(400).json({ error: 'Recipe link is required' });
    }
    
    try {
      // Fetch content from the URL
      const content = await fetchRecipeContent(link);
      
      // Extract recipe details using OpenAI (with fallback)
      const extractedRecipe = await extractRecipeDetails(link, content);
      
      // Create the recipe in the database
      const recipeData: recipeModel.Recipe = {
        title: extractedRecipe.title,
        link,
        ingredients: extractedRecipe.ingredients,
        materials: extractedRecipe.materials,
        steps: extractedRecipe.steps,
        markdown: extractedRecipe.markdown,
        tags: extractedRecipe.tags
      };
      
      const recipeId = await recipeModel.createRecipe(recipeData);
      
      res.status(201).json({
        id: recipeId,
        ...recipeData
      });
    } catch (fetchError) {
      console.error('Error processing URL:', fetchError);
      
      // Create a minimal recipe entry with just the URL
      const recipeData: recipeModel.Recipe = {
        title: "Recipe from " + link,
        link,
        ingredients: "Failed to extract",
        materials: "Failed to extract",
        steps: "Failed to extract",
        markdown: `# Recipe from ${link}\n\nFailed to extract content. Please try re-importing later.`,
        tags: ["unprocessed"]
      };
      
      const recipeId = await recipeModel.createRecipe(recipeData);
      
      res.status(201).json({
        id: recipeId,
        ...recipeData,
        warning: "Could not fully process the recipe URL. Basic entry created."
      });
    }
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
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid recipe ID' });
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
      // Fetch content from the URL
      const content = await fetchRecipeContent(existingRecipe.link);
      
      // Extract recipe details using OpenAI (with fallback)
      const extractedRecipe = await extractRecipeDetails(existingRecipe.link, content);
      
      // Update the recipe in the database
      const recipeData: Partial<recipeModel.Recipe> = {
        title: extractedRecipe.title,
        ingredients: extractedRecipe.ingredients,
        materials: extractedRecipe.materials,
        steps: extractedRecipe.steps,
        markdown: extractedRecipe.markdown,
        tags: extractedRecipe.tags
      };
      
      await recipeModel.updateRecipe(id, recipeData);
      
      res.json({
        id,
        link: existingRecipe.link,
        ...recipeData
      });
    } catch (fetchError) {
      console.error('Error re-processing URL:', fetchError);
      res.status(200).json({
        id,
        link: existingRecipe.link,
        warning: "Could not fully re-process the recipe URL. Recipe remains unchanged."
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