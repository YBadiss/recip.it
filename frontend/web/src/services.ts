import { createServices } from '@recipe/core';

// Use the createServices factory to get properly initialized services
const { authService, recipeService, apiService } = createServices(import.meta.env.VITE_API_URL || '/api');

export { authService, recipeService, apiService };