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
      console.error('Authentication required');

      // If we have a redirect handler, use it
      if (authRedirectHandler) {
        // Get current path to redirect back after login
        const currentPath = window.location.pathname;
        authRedirectHandler(currentPath);
      }
    }
    // Log other errors (except profile 401s, which are expected during auth checks)
    else if (error.response && !(error.response.status === 401 && url.includes('/users/profile'))) {
      console.error(`API Error: ${error.response.status} - ${error.response.statusText}`);
    } else if (!error.response) {
      console.error('API Error:', error.message);
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
    try {
      const response = await api.get<UserResponse>('/users/profile');
      return response.data.user;
    } catch (error: unknown) {
      // For unauthorized errors, just handle gracefully without logging or redirecting
      const apiError = error as ApiErrorResponse;
      if (apiError?.response?.status === 401) {
        throw error;
      }
      console.error('Error fetching user profile:', error);
      throw error;
    }
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

  // Import a new recipe from file upload
  importFile: async (formData: FormData): Promise<Recipe> => {
    // Create a custom config to set the correct content type for file uploads
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    };
    const response = await api.post<Recipe>('/recipes/upload', formData, config);
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

  // Add recipe to user's list
  addToUserList: async (recipeUrl: string): Promise<Recipe> => {
    const response = await api.post<Recipe>('/recipes', { link: recipeUrl });
    return response.data;
  },

  // Remove recipe from user's list
  removeFromUserList: async (id: string): Promise<void> => {
    await api.post(`/recipes/${id}/remove`);
  },
};

export default api;
