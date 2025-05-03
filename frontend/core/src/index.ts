// Export types
export * from './types';

// Export services
export * from './services';

// Service initialization
import { ApiService, AuthService, RecipeService } from './services';

// Factory function to create services
export function createServices(apiBaseUrl: string) {
  // Create API service first
  const apiService = new ApiService(apiBaseUrl);
  
  // Create auth and recipe services
  const authService = new AuthService(apiService);
  const recipeService = new RecipeService(apiService);
  
  // Set up circular references
  authService.setRecipeService(recipeService);
  
  return {
    apiService,
    authService,
    recipeService
  };
} 