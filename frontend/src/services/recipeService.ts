import { Recipe } from '../types/recipe';
import { recipeApi } from './api';

interface PaginatedRecipes {
  items: Recipe[];
  total: number;
  totalPages: number;
  page: number;
}

class RecipeService {
  private recipeCache: Recipe[] | null = null;
  private lastFetchTimestamp: number = 0;
  private cacheExpiryMs: number = 5 * 60 * 1000; // 5 minutes cache expiry
  private fetchPromise: Promise<Recipe[]> | null = null; // Track ongoing requests

  /**
   * Fetches all recipes from the API and updates the cache
   */
  private async fetchAllRecipes(): Promise<Recipe[]> {
    // If there's already an active fetch in progress, return that promise
    // instead of creating a new request
    if (this.fetchPromise) {
      return this.fetchPromise;
    }

    // Create a new fetch promise and store it
    this.fetchPromise = (async () => {
      try {
        const response = await recipeApi.getAll();
        const recipes = response.recipes;

        if (Array.isArray(recipes)) {
          this.recipeCache = recipes;
          this.lastFetchTimestamp = Date.now();
          return recipes;
        } else {
          console.error('Invalid recipe data format:', recipes);
          return [];
        }
      } catch (error) {
        console.error('Error fetching recipes:', error);
        throw error;
      } finally {
        // Clear the fetch promise once complete
        this.fetchPromise = null;
      }
    })();

    return this.fetchPromise;
  }

  /**
   * Gets recipes from cache if fresh, otherwise fetches from API
   */
  private async getAllRecipes(): Promise<Recipe[]> {
    const now = Date.now();
    const isCacheExpired = now - this.lastFetchTimestamp > this.cacheExpiryMs;

    if (!this.recipeCache || isCacheExpired) {
      return this.fetchAllRecipes();
    }

    return this.recipeCache;
  }

  /**
   * Filters and paginates recipes based on query, authentication, and pagination settings
   */
  async getFilteredRecipes(
    query: string = '',
    isAuthenticated: boolean = false,
    userPage: number = 1,
    communityPage: number = 1,
    itemsPerPage: number = 6
  ): Promise<{
    userRecipes: PaginatedRecipes;
    communityRecipes: PaginatedRecipes;
  }> {
    // First, ensure we have recipes
    const recipes = await this.getAllRecipes();

    // Filter based on search query
    const queryFilteredRecipes = query
      ? recipes.filter(
          recipe =>
            recipe.title.toLowerCase().includes(query.toLowerCase()) ||
            (recipe.description && recipe.description.toLowerCase().includes(query.toLowerCase()))
        )
      : recipes;

    // Split into user and community recipes
    const userRecipesAll = isAuthenticated
      ? queryFilteredRecipes.filter(recipe => recipe.inUserList)
      : [];

    const communityRecipesAll = isAuthenticated
      ? queryFilteredRecipes.filter(recipe => !recipe.inUserList)
      : queryFilteredRecipes;

    // Calculate pagination for user recipes
    const userTotal = userRecipesAll.length;
    const userTotalPages = Math.max(1, Math.ceil(userTotal / itemsPerPage));
    const safeUserPage = Math.min(userPage, userTotalPages);
    const userStart = (safeUserPage - 1) * itemsPerPage;

    // Calculate pagination for community recipes
    const communityTotal = communityRecipesAll.length;
    const communityTotalPages = Math.max(1, Math.ceil(communityTotal / itemsPerPage));
    const safeCommunityPage = Math.min(communityPage, communityTotalPages);
    const communityStart = (safeCommunityPage - 1) * itemsPerPage;

    // Paginate results
    return {
      userRecipes: {
        items: userRecipesAll.slice(userStart, userStart + itemsPerPage),
        total: userTotal,
        totalPages: userTotalPages,
        page: safeUserPage,
      },
      communityRecipes: {
        items: communityRecipesAll.slice(communityStart, communityStart + itemsPerPage),
        total: communityTotal,
        totalPages: communityTotalPages,
        page: safeCommunityPage,
      },
    };
  }

  /**
   * Clears the recipe cache
   */
  private clearCache(): void {
    this.recipeCache = null;
    this.lastFetchTimestamp = 0;
  }

  /**
   * Forces a refresh of recipe data
   * This should be called when authentication state changes
   */
  async refreshData(): Promise<void> {
    this.clearCache();
    try {
      // If there's already an ongoing fetch, don't create another one
      if (!this.fetchPromise) {
        await this.fetchAllRecipes();
      } else {
        // Just wait for the existing request to complete
        await this.fetchPromise;
      }
    } catch (error) {
      console.error('Error refreshing recipe data:', error);
    }
  }

  private updateRecipeInCache(recipe: Recipe): void {
    if (this.recipeCache) {
      this.recipeCache = this.recipeCache.map(r => (r.id === recipe.id ? recipe : r));
    } else {
      this.refreshData();
    }
  }

  /**
   * Get a single recipe by ID
   * Updates cache if the recipe exists in cache
   */
  async getById(id: string): Promise<Recipe> {
    try {
      const recipe = await recipeApi.getById(id);

      // Update the recipe in cache if it exists
      if (this.recipeCache) {
        this.updateRecipeInCache(recipe);
      }

      return recipe;
    } catch (error) {
      console.error(`Error fetching recipe with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Add recipe to user's list
   * Updates cache after adding
   */
  async addToUserList(recipeUrl: string): Promise<Recipe> {
    try {
      const recipe = await recipeApi.addToUserList(recipeUrl);

      // Update cache
      this.refreshData();

      return recipe;
    } catch (error) {
      console.error('Error adding recipe to user list:', error);
      throw error;
    }
  }

  /**
   * Remove recipe from user's list
   * Updates the cache after removal
   */
  async removeFromUserList(id: string): Promise<void> {
    try {
      await recipeApi.removeFromUserList(id);

      // Update cache
      this.refreshData();
    } catch (error) {
      console.error(`Error removing recipe with ID ${id} from user list:`, error);
      throw error;
    }
  }

  /**
   * Import a new recipe from URL
   * Updates cache after import
   */
  async import(recipeImport: { link: string }): Promise<Recipe> {
    try {
      const recipe = await recipeApi.import(recipeImport);

      // Update cache
      this.refreshData();

      return recipe;
    } catch (error) {
      console.error('Error importing recipe:', error);
      throw error;
    }
  }

  /**
   * Import a new recipe from file upload
   * Updates cache after import
   */
  async importFile(formData: FormData): Promise<Recipe> {
    try {
      const recipe = await recipeApi.importFile(formData);

      // Update cache
      this.refreshData();

      return recipe;
    } catch (error) {
      console.error('Error importing recipe from file:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
export const recipeService = new RecipeService();
