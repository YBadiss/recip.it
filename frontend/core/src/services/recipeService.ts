import { Recipe } from "../types";
import { ApiService } from "./api";
import { remove as removeDiacritics } from "diacritics";

interface PaginatedRecipes {
  items: Recipe[];
  total: number;
  totalPages: number;
  page: number;
}

// Interface for searchable recipe data
interface SearchableRecipe {
  id: string;
  searchText: string; // Combined normalized text of all searchable fields
}

export class RecipeService {
  private apiService: ApiService;
  private recipeCache: Recipe[] = [];
  private searchableRecipes: SearchableRecipe[] = []; // New cache for searchable data
  private lastFetchTimestamp: number = 0;
  private cacheExpiryMs: number = 5 * 60 * 1000; // 5 minutes cache expiry
  private fetchPromise: Promise<Recipe[]> | null = null; // Track ongoing requests

  constructor(apiService: ApiService) {
    this.apiService = apiService;
  }

  /**
   * Creates a searchable version of the recipes with all text fields combined
   */
  private createSearchableRecipes(recipes: Recipe[]): SearchableRecipe[] {
    return recipes.map((recipe) => {
      // Collect all searchable text from the recipe
      const searchParts: string[] = [
        recipe.title || "",
        recipe.description || "",
      ];

      // Add ingredients text
      if (recipe.ingredients && recipe.ingredients.length > 0) {
        recipe.ingredients.forEach((ingredient) => {
          searchParts.push(ingredient.name || "");
          searchParts.push(ingredient.quantity || "");
          searchParts.push(ingredient.unit || "");
        });
      }

      // Add materials text
      if (recipe.materials && recipe.materials.length > 0) {
        recipe.materials.forEach((material) => {
          searchParts.push(material.name || "");
          searchParts.push(material.description || "");
        });
      }

      // Add steps text
      if (recipe.steps && recipe.steps.length > 0) {
        recipe.steps.forEach((step) => {
          searchParts.push(step.action || "");
        });
      }

      // Add tags
      if (recipe.tags && recipe.tags.length > 0) {
        recipe.tags.forEach((tag) => {
          searchParts.push(tag || "");
        });
      }

      // Join all parts, lowercase, and remove diacritics
      const searchText = removeDiacritics(searchParts.join(" ").toLowerCase());

      return {
        id: recipe.id!,
        searchText,
      };
    });
  }

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
        const response = await this.apiService.getAllRecipes();
        const recipes = response.recipes;

        if (Array.isArray(recipes)) {
          this.recipeCache = recipes;
          this.searchableRecipes = this.createSearchableRecipes(recipes);
          this.lastFetchTimestamp = Date.now();
          return recipes;
        } else {
          console.error("Invalid recipe data format:", recipes);
          return [];
        }
      } catch (error) {
        console.error("Error fetching recipes:", error);
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
    query: string = "",
    isAuthenticated: boolean = false,
    userPage: number = 1,
    communityPage: number = 1,
    itemsPerPage: number = 6,
  ): Promise<{
    userRecipes: PaginatedRecipes;
    communityRecipes: PaginatedRecipes;
  }> {
    // First, ensure we have recipes
    await this.getAllRecipes();

    // Convert empty strings to null for cleaner code
    const normalizedQuery = removeDiacritics(query.trim().toLowerCase());

    // Get a Map of recipes by ID for efficient lookup
    const recipesById = new Map(
      this.recipeCache.map((recipe) => [recipe.id, recipe]),
    );

    // Filter based on search query using the searchable text
    const queryFilteredRecipes = normalizedQuery
      ? this.searchableRecipes
          .filter((searchableRecipe) =>
            searchableRecipe.searchText.includes(normalizedQuery),
          )
          // Look up the full recipe objects using the IDs
          .map((searchableRecipe) => recipesById.get(searchableRecipe.id)!)
      : this.recipeCache;

    // Split into user and community recipes
    const userRecipesAll = isAuthenticated
      ? queryFilteredRecipes.filter((recipe) => recipe.inUserList)
      : [];

    const communityRecipesAll = isAuthenticated
      ? queryFilteredRecipes.filter((recipe) => !recipe.inUserList)
      : queryFilteredRecipes;

    // Calculate pagination for user recipes
    const userTotal = userRecipesAll.length;
    const userTotalPages = Math.max(1, Math.ceil(userTotal / itemsPerPage));
    const safeUserPage = Math.min(userPage, userTotalPages);
    const userStart = (safeUserPage - 1) * itemsPerPage;

    // Calculate pagination for community recipes
    const communityTotal = communityRecipesAll.length;
    const communityTotalPages = Math.max(
      1,
      Math.ceil(communityTotal / itemsPerPage),
    );
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
        items: communityRecipesAll.slice(
          communityStart,
          communityStart + itemsPerPage,
        ),
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
    this.recipeCache = [];
    this.searchableRecipes = [];
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
      console.error("Error refreshing recipe data:", error);
    }
  }

  private updateRecipeInCache(recipe: Recipe): void {
    if (this.recipeCache) {
      this.recipeCache = this.recipeCache.map((r) =>
        r.id === recipe.id ? recipe : r,
      );

      // Also update in the searchable cache
      if (this.searchableRecipes) {
        const newSearchableRecipe = this.createSearchableRecipes([recipe])[0];
        this.searchableRecipes = this.searchableRecipes.map((r) =>
          r.id === recipe.id ? newSearchableRecipe : r,
        );
      }
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
      const recipe = await this.apiService.getRecipeById(id);

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
      const recipe = await this.apiService.addRecipeToUserList(recipeUrl);

      // Update cache
      this.refreshData();

      return recipe;
    } catch (error) {
      console.error("Error adding recipe to user list:", error);
      throw error;
    }
  }

  /**
   * Remove recipe from user's list
   * Updates cache after removal
   */
  async removeFromUserList(id: string): Promise<void> {
    try {
      await this.apiService.removeRecipeFromUserList(id);

      // Update the cache
      this.refreshData();
    } catch (error) {
      console.error(
        `Error removing recipe with ID ${id} from user list:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Import a recipe by URL
   */
  async import(recipeImport: { link: string }): Promise<Recipe> {
    try {
      const recipe = await this.apiService.importRecipe(recipeImport);

      // Update cache
      this.refreshData();

      return recipe;
    } catch (error) {
      console.error("Error importing recipe:", error);
      throw error;
    }
  }

  /**
   * Import a recipe from a file upload
   */
  async importFile(formData: FormData): Promise<Recipe> {
    try {
      const recipe = await this.apiService.importRecipeFromFile(formData);

      // Update cache
      this.refreshData();

      return recipe;
    } catch (error) {
      console.error("Error importing recipe from file:", error);
      throw error;
    }
  }
}
