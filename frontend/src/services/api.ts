import axios from 'axios';
import { Recipe, RecipeImport } from '../types/recipe';
import { LoginCredentials, RegisterData, User, UserResponse } from '../types/user';

// Use environment variable with fallback
const API_URL = import.meta.env.VITE_API_URL || '/api';

console.log('API URL:', API_URL); // For debugging

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for cookies - this ensures cookies are sent with requests
});

// We don't need to manually add the token since it's in the cookie
// Just keeping a simple interceptor for logging purposes
api.interceptors.request.use(
  config => {
    return config;
  },
  error => Promise.reject(error)
);

// Add response interceptor to handle errors
api.interceptors.response.use(
  response => response,
  error => {
    // Handle 404 errors
    if (error.response && error.response.status === 404) {
      // Redirect to NotFoundPage
      window.location.href = '/404';
      return new Promise(() => {}); // This prevents further error handling
    }
    return Promise.reject(error);
  }
);

// Authentication API functions
export const authApi = {
  // Register a new user
  register: async (userData: RegisterData): Promise<User> => {
    const response = await api.post<UserResponse>('/users/register', userData);
    return response.data.user;
  },

  // Login user
  login: async (credentials: LoginCredentials): Promise<User> => {
    const response = await api.post<UserResponse>('/users/login', credentials);
    return response.data.user;
  },

  // Logout user
  logout: async (): Promise<void> => {
    await api.post('/users/logout');
  },

  // Get current user profile
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<UserResponse>('/users/profile');
    return response.data.user;
  },
};

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
    await api.post(`/recipes/${id}/remove`); // Updated to use POST /recipes/:id/remove
  },
};

export default api;
