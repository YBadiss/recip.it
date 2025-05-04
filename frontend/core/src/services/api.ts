import {
  Recipe,
  RecipeImport,
  LoginCredentials,
  RegisterData,
  User,
  UserResponse,
} from "../types";

// Define error interface
interface ApiErrorResponse {
  status?: number;
  statusText?: string;
  message: string;
  url?: string;
}

interface RecipeResponse {
  recipe: Recipe;
}

interface RecipesResponse {
  recipes: Recipe[];
}

export class ApiService {
  private baseUrl: string;
  private authRedirectHandler: ((url?: string) => void) | null = null;
  private pendingProfileRequest: Promise<User> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  // Function to set the redirect handler
  setAuthRedirectHandler(handler: (url?: string) => void): void {
    this.authRedirectHandler = handler;
  }

  private async request<T>(
    method: string,
    path: string,
    data?: unknown,
    customHeaders?: Record<string, string>,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...customHeaders,
    };

    const options: RequestInit = {
      method,
      headers,
      credentials: "include", // Important for cookies - this ensures cookies are sent with requests
    };

    // Add body data for non-GET requests if data is provided
    if (method !== "GET" && data) {
      // If it's FormData, don't stringify and let browser set the content type
      if (data instanceof FormData) {
        delete headers["Content-Type"]; // Let browser set this with boundary
        options.body = data;
      } else {
        options.body = JSON.stringify(data);
      }
    }

    const response = await fetch(url, options);

    // Handle unauthorized responses (except for profile endpoint)
    if (response.status === 401 && !path.includes("/users/profile")) {
      if (this.authRedirectHandler) {
        // Get current path to redirect back after login
        const currentPath =
          typeof window !== "undefined" ? window.location.pathname : "";
        this.authRedirectHandler(currentPath);
      }
    }

    // For any non-successful response, throw an error
    if (!response.ok) {
      const error: ApiErrorResponse = {
        status: response.status,
        statusText: response.statusText,
        message: `Request failed with status ${response.status}`,
        url: path,
      };
      throw error;
    }

    // Parse JSON response
    const responseData = await response.json();
    return responseData;
  }

  // Authentication API functions
  // Register a new user
  async register(userData: RegisterData): Promise<User> {
    const response = await this.request<UserResponse>(
      "POST",
      "/users/register",
      userData,
    );
    return response.user;
  }

  // Login user
  async login(credentials: LoginCredentials): Promise<User> {
    const response = await this.request<UserResponse>(
      "POST",
      "/users/login",
      credentials,
    );
    return response.user;
  }

  // Logout user
  async logout(): Promise<void> {
    await this.request("POST", "/users/logout");
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
        const response = await this.request<UserResponse>(
          "GET",
          "/users/profile",
        );
        return response.user;
      } catch (error: unknown) {
        // For unauthorized errors, just handle gracefully
        const apiError = error as ApiErrorResponse;
        if (apiError?.status === 401) {
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
    return this.request<RecipesResponse>("GET", "/recipes");
  }

  // Get a single recipe by ID
  async getRecipeById(id: string): Promise<Recipe> {
    const response = await this.request<RecipeResponse>(
      "GET",
      `/recipes/${id}`,
    );
    return response.recipe;
  }

  // Import a new recipe from URL
  async importRecipe(recipeImport: RecipeImport): Promise<Recipe> {
    const response = await this.request<RecipeResponse>(
      "POST",
      "/recipes",
      recipeImport,
    );
    return response.recipe;
  }

  // Add recipe to user's list
  async addRecipeToUserList(recipeUrl: string): Promise<Recipe> {
    const response = await this.request<RecipeResponse>("POST", "/recipes", {
      link: recipeUrl,
    });
    return response.recipe;
  }

  // Import a new recipe from file upload
  async importRecipeFromFile(formData: FormData): Promise<Recipe> {
    const response = await this.request<RecipeResponse>(
      "POST",
      "/recipes/upload",
      formData,
      // No need to set content-type, browser will set it with boundary
    );
    return response.recipe;
  }

  // Remove recipe from user's list
  async removeRecipeFromUserList(id: string): Promise<void> {
    await this.request("POST", `/recipes/${id}/remove`);
  }
}

// Default export (will be initialized in the application)
