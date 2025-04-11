import axios from 'axios';
import { Recipe, RecipeImport } from '../types/recipe';

// Use environment variable with fallback
const API_URL = import.meta.env.VITE_API_URL || '/api';

console.log('API URL:', API_URL); // For debugging

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API functions for recipes
export const recipeApi = {
  // Get all recipes (with optional search query)
  getAll: async (query?: string): Promise<Recipe[]> => {
    try {
      const response = await api.get<Recipe[]>('/recipes', {
        params: query ? { q: query } : undefined,
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching recipes:', error);
      throw error;
    }
  },

  // Get a single recipe by ID
  getById: async (id: string): Promise<Recipe> => {
    const response = await api.get<Recipe>(`/recipes/${id}`);
    return response.data;
  },

  // Import a new recipe from URL
  import: async (recipeImport: RecipeImport): Promise<Recipe> => {
    const response = await api.post<Recipe>('/recipes', recipeImport);
    return response.data;
  },

  // Re-import a recipe from its original URL
  reimport: async (id: string): Promise<Recipe> => {
    const response = await api.post<Recipe>(`/recipes/${id}/import`);
    return response.data;
  },

  // Update a recipe
  update: async (id: string, recipe: Partial<Recipe>): Promise<Recipe> => {
    const response = await api.put<Recipe>(`/recipes/${id}`, recipe);
    return response.data;
  },

  // Delete a recipe
  delete: async (id: string): Promise<void> => {
    await api.delete(`/recipes/${id}`);
  },
};

export default api;
