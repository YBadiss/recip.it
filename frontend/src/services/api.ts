import axios from 'axios';
import { Recipe, RecipeImport } from '../types/recipe';
import { LoginCredentials, RegisterData, User, UserResponse } from '../types/user';

// Use environment variable with fallback
const API_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for cookies - this ensures cookies are sent with requests
});

// Store the redirect function - will be set by the auth service
let authRedirectHandler: ((url?: string) => void) | null = null;

// Track pending profile request to avoid duplicates
let pendingProfileRequest: Promise<User> | null = null;

// Function to set the redirect handler
export const setAuthRedirectHandler = (handler: (url?: string) => void) => {
  authRedirectHandler = handler;
};

// We don't need to manually add the token since it's in the cookie
// Just keeping a simple interceptor for logging purposes
api.interceptors.request.use(
  config => {
    return config;
  },
  error => Promise.reject(error)
);

// Define error interface
interface ApiErrorResponse {
  response?: {
    status: number;
    statusText: string;
  };
  message: string;
  config?: {
    url?: string;
  };
}

interface RecipeResponse {
  recipe: Recipe;
}

interface RecipesResponse {
  recipes: Recipe[];
}

// Add response interceptor to handle errors, but don't redirect to 404
// Let the components handle specific status codes
api.interceptors.response.use(
  response => response,
  error => {
    // Extract URL path from error config
    const apiError = error as ApiErrorResponse;
    const url = apiError.config?.url || '';

    // Check for 401 Unauthorized responses that are not from the profile endpoint
    if (error.response && error.response.status === 401 && !url.includes('/users/profile')) {
      // If we have a redirect handler, use it
      if (authRedirectHandler) {
        // Get current path to redirect back after login
        const currentPath = window.location.pathname;
        authRedirectHandler(currentPath);
      }
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
    // If there's already a pending request, return that promise
    // instead of creating a new request
    if (pendingProfileRequest) {
      return pendingProfileRequest;
    }

    // Create a new request promise
    pendingProfileRequest = (async () => {
      try {
        const response = await api.get<UserResponse>('/users/profile');
        return response.data.user;
      } catch (error: unknown) {
        // For unauthorized errors, just handle gracefully without logging or redirecting
        const apiError = error as ApiErrorResponse;
        if (apiError?.response?.status === 401) {
          throw error;
        }
        throw error;
      } finally {
        // Clear the pending request when done
        pendingProfileRequest = null;
      }
    })();

    return pendingProfileRequest;
  },
};

// API functions for recipes
export const recipeApi = {
  // Get all recipes with optional params (search query, pagination, etc.)
  getAll: async (): Promise<RecipesResponse> => {
    const response = await api.get<RecipesResponse>('/recipes');
    return response.data;
  },

  // Get a single recipe by ID
  getById: async (id: string): Promise<Recipe> => {
    const response = await api.get<RecipeResponse>(`/recipes/${id}`);
    return response.data.recipe;
  },

  // Import a new recipe from URL
  import: async (recipeImport: RecipeImport): Promise<Recipe> => {
    const response = await api.post<RecipeResponse>('/recipes', recipeImport);
    return response.data.recipe;
  },

  // Add recipe to user's list
  addToUserList: async (recipeUrl: string): Promise<Recipe> => {
    const response = await api.post<RecipeResponse>('/recipes', { link: recipeUrl });
    return response.data.recipe;
  },

  // Import a new recipe from file upload
  importFile: async (formData: FormData): Promise<Recipe> => {
    // Create a custom config to set the correct content type for file uploads
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    };
    const response = await api.post<RecipeResponse>('/recipes/upload', formData, config);
    return response.data.recipe;
  },

  // Remove recipe from user's list
  removeFromUserList: async (id: string): Promise<void> => {
    await api.post(`/recipes/${id}/remove`);
  },
};

export default api;
