import axios, { AxiosInstance } from 'axios';
import { Recipe, RecipeImport, LoginCredentials, RegisterData, User, UserResponse } from '../types';

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

export class ApiService {
  private api: AxiosInstance;
  private authRedirectHandler: ((url?: string) => void) | null = null;
  private pendingProfileRequest: Promise<User> | null = null;

  constructor(baseUrl: string) {
    // Create axios instance with default config
    this.api = axios.create({
      baseURL: baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // Important for cookies - this ensures cookies are sent with requests
    });

    // Set up response interceptor
    this.setupInterceptors();
  }

  // Function to set the redirect handler
  setAuthRedirectHandler(handler: (url?: string) => void): void {
    this.authRedirectHandler = handler;
  }

  private setupInterceptors(): void {
    // We don't need to manually add the token since it's in the cookie
    // Just keeping a simple interceptor for logging purposes
    this.api.interceptors.request.use(
      config => {
        return config;
      },
      error => Promise.reject(error)
    );

    // Add response interceptor to handle errors, but don't redirect to 404
    // Let the components handle specific status codes
    this.api.interceptors.response.use(
      response => response,
      error => {
        // Extract URL path from error config
        const apiError = error as ApiErrorResponse;
        const url = apiError.config?.url || '';

        // Check for 401 Unauthorized responses that are not from the profile endpoint
        if (error.response && error.response.status === 401 && !url.includes('/users/profile')) {
          // If we have a redirect handler, use it
          if (this.authRedirectHandler) {
            // Get current path to redirect back after login
            const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
            this.authRedirectHandler(currentPath);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Authentication API functions
  // Register a new user
  async register(userData: RegisterData): Promise<User> {
    const response = await this.api.post<UserResponse>('/users/register', userData);
    return response.data.user;
  }

  // Login user
  async login(credentials: LoginCredentials): Promise<User> {
    const response = await this.api.post<UserResponse>('/users/login', credentials);
    return response.data.user;
  }

  // Logout user
  async logout(): Promise<void> {
    await this.api.post('/users/logout');
  }

  // Get current user profile
  async getCurrentUser(): Promise<User> {
    // If there's already a pending request, return that promise
    // instead of creating a new request
    if (this.pendingProfileRequest) {
      return this.pendingProfileRequest;
    }

    // Create a new request promise
    this.pendingProfileRequest = (async () => {
      try {
        const response = await this.api.get<UserResponse>('/users/profile');
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
        this.pendingProfileRequest = null;
      }
    })();

    return this.pendingProfileRequest;
  }

  // API functions for recipes
  // Get all recipes with optional params (search query, pagination, etc.)
  async getAllRecipes(): Promise<RecipesResponse> {
    const response = await this.api.get<RecipesResponse>('/recipes');
    return response.data;
  }

  // Get a single recipe by ID
  async getRecipeById(id: string): Promise<Recipe> {
    const response = await this.api.get<RecipeResponse>(`/recipes/${id}`);
    return response.data.recipe;
  }

  // Import a new recipe from URL
  async importRecipe(recipeImport: RecipeImport): Promise<Recipe> {
    const response = await this.api.post<RecipeResponse>('/recipes', recipeImport);
    return response.data.recipe;
  }

  // Add recipe to user's list
  async addRecipeToUserList(recipeUrl: string): Promise<Recipe> {
    const response = await this.api.post<RecipeResponse>('/recipes', { link: recipeUrl });
    return response.data.recipe;
  }

  // Import a new recipe from file upload
  async importRecipeFromFile(formData: FormData): Promise<Recipe> {
    // Create a custom config to set the correct content type for file uploads
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    };
    const response = await this.api.post<RecipeResponse>('/recipes/upload', formData, config);
    return response.data.recipe;
  }

  // Remove recipe from user's list
  async removeRecipeFromUserList(id: string): Promise<void> {
    await this.api.post(`/recipes/${id}/remove`);
  }

  // Get the raw axios instance for direct use if needed
  getAxiosInstance(): AxiosInstance {
    return this.api;
  }
}

// Default export (will be initialized in the application) 