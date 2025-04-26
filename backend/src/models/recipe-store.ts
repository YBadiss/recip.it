import { v4 as uuidv4 } from 'uuid';
import sqlite3 from 'sqlite3';
import { Recipe } from './recipe';

// Database row type
export interface DbRow {
  id: string;
  title: string;
  link: string;
  ingredients: string;
  materials: string;
  steps: string;
  tags: string;
  imageUrl: string;
  cookingTime: string;
  servings: number;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export class RecipeStore {
  private dbConnection: sqlite3.Database;

  constructor(dbConnection: sqlite3.Database) {
    this.dbConnection = dbConnection;
    // Create index on link column if it doesn't exist
    this.ensureLinkIndex();
  }

  // Ensure the link index exists for faster lookups
  private ensureLinkIndex(): void {
    this.dbConnection.run('CREATE INDEX IF NOT EXISTS idx_recipes_link ON recipes(link)', err => {
      if (err) {
        console.error('Error creating link index:', err);
      }
    });
  }

  // Get all recipes with optional search parameters
  async getAllRecipes(
    options: { searchTerm?: string; limit?: number; offset?: number } = {}
  ): Promise<{ recipes: Recipe[]; total: number }> {
    const { searchTerm, limit = 20, offset = 0 } = options;

    return new Promise((resolve, reject) => {
      if (searchTerm) {
        this.searchRecipes(searchTerm, limit, offset).then(resolve).catch(reject);
      } else {
        // Run both queries in parallel
        const getTotalCount = new Promise<number>((resolveCount, rejectCount) => {
          this.dbConnection.get('SELECT COUNT(*) as total FROM recipes', (err, row) => {
            if (err) {
              rejectCount(err);
              return;
            }
            resolveCount((row as { total: number }).total);
          });
        });

        const getPaginatedRecipes = new Promise<Recipe[]>((resolveRecipes, rejectRecipes) => {
          this.dbConnection.all(
            'SELECT * FROM recipes ORDER BY updated_at DESC LIMIT ? OFFSET ?',
            [limit, offset],
            (err, rows) => {
              if (err) {
                rejectRecipes(err);
                return;
              }
              resolveRecipes(rows.map(row => this.parseRecipe(row as DbRow)));
            }
          );
        });

        // Wait for both queries to complete
        Promise.all([getTotalCount, getPaginatedRecipes])
          .then(([total, recipes]) => {
            resolve({ recipes, total });
          })
          .catch(reject);
      }
    });
  }

  // Get a single recipe by ID
  async getRecipeById(id: string): Promise<Recipe | null> {
    return new Promise((resolve, reject) => {
      this.dbConnection.get('SELECT * FROM recipes WHERE id = ?', [id], (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row ? this.parseRecipe(row as DbRow) : null);
      });
    });
  }

  // Get a recipe by link
  async getRecipeByLink(link: string): Promise<Recipe | null> {
    return new Promise((resolve, reject) => {
      this.dbConnection.get('SELECT * FROM recipes WHERE link = ?', [link], (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row ? this.parseRecipe(row as DbRow) : null);
      });
    });
  }

  // Get a recipe by normalized link
  async getRecipeByNormalizedLink(normalizedLink: string): Promise<Recipe | null> {
    return new Promise((resolve, reject) => {
      this.dbConnection.get(
        'SELECT * FROM recipes WHERE link = ?',
        [normalizedLink],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(row ? this.parseRecipe(row as DbRow) : null);
        }
      );
    });
  }

  // Create a new recipe
  async createRecipe(recipe: Recipe): Promise<string> {
    return new Promise((resolve, reject) => {
      const recipeId = uuidv4();
      const preparedRecipe = this.prepareRecipeForDb({ ...recipe, id: recipeId });

      this.dbConnection.run(
        `INSERT INTO recipes (id, title, link, ingredients, materials, steps, tags, imageUrl, cookingTime, servings) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          preparedRecipe.id,
          preparedRecipe.title,
          preparedRecipe.link,
          preparedRecipe.ingredients,
          preparedRecipe.materials,
          preparedRecipe.steps,
          preparedRecipe.tags,
          preparedRecipe.imageUrl || '',
          preparedRecipe.cookingTime || '',
          preparedRecipe.servings || 0,
        ],
        function (err) {
          if (err) {
            reject(err);
            return;
          }
          resolve(recipeId);
        }
      );
    });
  }

  // Update an existing recipe
  async updateRecipe(id: string, recipe: Partial<Recipe>): Promise<void> {
    return new Promise((resolve, reject) => {
      const preparedRecipe = this.prepareRecipeForDb(recipe as Recipe);
      const updates: string[] = [];
      const values: unknown[] = [];

      if (preparedRecipe.title) {
        updates.push('title = ?');
        values.push(preparedRecipe.title);
      }
      if (preparedRecipe.link) {
        updates.push('link = ?');
        values.push(preparedRecipe.link);
      }
      if (preparedRecipe.ingredients) {
        updates.push('ingredients = ?');
        values.push(preparedRecipe.ingredients);
      }
      if (preparedRecipe.materials) {
        updates.push('materials = ?');
        values.push(preparedRecipe.materials);
      }
      if (preparedRecipe.steps) {
        updates.push('steps = ?');
        values.push(preparedRecipe.steps);
      }
      if (preparedRecipe.tags) {
        updates.push('tags = ?');
        values.push(preparedRecipe.tags);
      }
      if (preparedRecipe.imageUrl !== undefined) {
        updates.push('imageUrl = ?');
        values.push(preparedRecipe.imageUrl);
      }
      if (preparedRecipe.cookingTime !== undefined) {
        updates.push('cookingTime = ?');
        values.push(preparedRecipe.cookingTime);
      }
      if (preparedRecipe.servings !== undefined) {
        updates.push('servings = ?');
        values.push(preparedRecipe.servings);
      }

      if (updates.length === 0) {
        resolve();
        return;
      }

      values.push(id);
      this.dbConnection.run(
        `UPDATE recipes SET ${updates.join(', ')} WHERE id = ?`,
        values,
        err => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        }
      );
    });
  }

  // Delete a recipe by ID
  async deleteRecipe(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.dbConnection.run('DELETE FROM recipes WHERE id = ?', [id], err => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  // Function to search recipes
  async searchRecipes(
    query: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ recipes: Recipe[]; total: number }> {
    return new Promise((resolve, reject) => {
      // Remove common stop words and punctuation from the query
      const cleanQuery = query
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .split(' ')
        .filter(word => word.length > 1) // Filter out single characters
        .join(' ');

      // First get the total count of matching recipes
      this.dbConnection.get(
        `SELECT COUNT(*) as total FROM recipes WHERE search_text LIKE ?`,
        [`%${cleanQuery}%`],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }

          const total = (row as { total: number }).total;

          // Then get the paginated results
          this.dbConnection.all(
            `
            SELECT * FROM recipes 
            WHERE search_text LIKE ?
            ORDER BY 
              -- Boost exact matches in title
              CASE WHEN title LIKE ? THEN 3
              -- Boost partial matches in title
              WHEN title LIKE ? THEN 2
              -- Everything else
              ELSE 1 END DESC,
              updated_at DESC
            LIMIT ? OFFSET ?
          `,
            [`%${cleanQuery}%`, `${query}`, `%${query}%`, limit, offset],
            (err, rows) => {
              if (err) {
                reject(err);
                return;
              }
              resolve({
                recipes: rows.map(row => this.parseRecipe(row as DbRow)),
                total,
              });
            }
          );
        }
      );
    });
  }

  // Get recipes with user ownership filter
  async getRecipesWithUserFilter(options: {
    searchTerm?: string;
    limit?: number;
    offset?: number;
    userId?: string;
    inUserList?: boolean;
  }): Promise<{ recipes: Recipe[]; total: number }> {
    const { searchTerm, limit = 20, offset = 0, userId, inUserList } = options;

    return new Promise((resolve, reject) => {
      const baseQuery = 'SELECT r.* FROM recipes r';
      const countQuery = 'SELECT COUNT(*) as total FROM recipes r';
      let joinClause = '';
      let whereClause = 'WHERE 1=1'; // Start with a clause that's always true
      const params: unknown[] = [];
      const countParams: unknown[] = [];

      // Handle user filter
      if (userId && inUserList !== undefined) {
        if (inUserList) {
          joinClause = 'INNER JOIN user_recipes ur ON r.id = ur.recipe_id';
          whereClause += ' AND ur.user_id = ?';
          params.push(userId);
          countParams.push(userId);
        } else {
          // Find recipes NOT in the user's list
          joinClause = 'LEFT JOIN user_recipes ur ON r.id = ur.recipe_id AND ur.user_id = ?';
          whereClause += ' AND ur.recipe_id IS NULL';
          params.push(userId); // For the join condition
          countParams.push(userId);
        }
      }

      // Handle search term filter
      let orderByClause = 'ORDER BY r.updated_at DESC';
      if (searchTerm) {
        // Clean the query
        const cleanQuery = searchTerm
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(' ')
          .filter(word => word.length > 1)
          .join(' ');

        whereClause += ' AND r.search_text LIKE ?';
        params.push(`%${cleanQuery}%`);
        countParams.push(`%${cleanQuery}%`);

        // Add ranking for search results
        orderByClause = `ORDER BY 
          CASE WHEN r.title LIKE ? THEN 3
          WHEN r.title LIKE ? THEN 2
          ELSE 1 END DESC,
          r.updated_at DESC`;
        params.push(`${searchTerm}`); // Exact title match highest rank
        params.push(`%${searchTerm}%`); // Partial title match medium rank
      }

      // Combine query parts
      const fullQuery = `${baseQuery} ${joinClause} ${whereClause} ${orderByClause} LIMIT ? OFFSET ?`;
      const fullCountQuery = `${countQuery} ${joinClause} ${whereClause}`;

      // Add limit and offset to params for the main query
      params.push(limit, offset);

      // First get total count
      this.dbConnection.get(fullCountQuery, countParams, (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        const total = (row as { total: number }).total;

        // Then get paginated results
        this.dbConnection.all(fullQuery, params, (err, rows) => {
          if (err) {
            reject(err);
            return;
          }

          resolve({
            recipes: rows.map(row => this.parseRecipe(row as DbRow)),
            total,
          });
        });
      });
    });
  }

  // Search recipes with user filter
  async searchRecipesWithUserFilter(
    query: string,
    userId: string,
    inUserList: boolean,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ recipes: Recipe[]; total: number }> {
    return new Promise((resolve, reject) => {
      // Clean the query as usual
      const cleanQuery = query
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(' ')
        .filter(word => word.length > 1)
        .join(' ');

      // Build the filter clause based on inUserList
      const filterClause = inUserList
        ? 'INNER JOIN user_recipes ur ON r.id = ur.recipe_id AND ur.user_id = ?'
        : 'LEFT JOIN user_recipes ur ON r.id = ur.recipe_id AND ur.user_id = ? WHERE ur.recipe_id IS NULL';

      // Get total count first
      this.dbConnection.get(
        `SELECT COUNT(*) as total FROM recipes r 
        ${filterClause}
        AND r.search_text LIKE ?`,
        [userId, `%${cleanQuery}%`],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }

          const total = (row as { total: number }).total;

          // Then get the paginated results with search ranking
          this.dbConnection.all(
            `SELECT r.* FROM recipes r 
            ${filterClause}
            AND r.search_text LIKE ?
            ORDER BY 
              CASE WHEN r.title LIKE ? THEN 3
              WHEN r.title LIKE ? THEN 2
              ELSE 1 END DESC,
              r.updated_at DESC
            LIMIT ? OFFSET ?`,
            [userId, `%${cleanQuery}%`, `${query}`, `%${query}%`, limit, offset],
            (err, rows) => {
              if (err) {
                reject(err);
                return;
              }

              resolve({
                recipes: rows.map(row => this.parseRecipe(row as DbRow)),
                total,
              });
            }
          );
        }
      );
    });
  }

  // Helper function to parse recipe from database row
  private parseRecipe(row: DbRow): Recipe {
    return {
      id: row.id,
      title: row.title,
      link: row.link,
      ingredients: JSON.parse(row.ingredients),
      materials: JSON.parse(row.materials),
      steps: JSON.parse(row.steps),
      tags: JSON.parse(row.tags),
      imageUrl: row.imageUrl,
      cookingTime: row.cookingTime,
      servings: row.servings,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  // Helper function to prepare recipe for database insertion
  private prepareRecipeForDb(recipe: Recipe): Record<string, unknown> {
    // Ensure all JSON fields have default values
    const ingredients = recipe.ingredients || [];
    const materials = recipe.materials || [];
    const steps = recipe.steps || [];
    const tags = recipe.tags || [];

    return {
      ...recipe,
      ingredients: JSON.stringify(ingredients),
      materials: JSON.stringify(materials),
      steps: JSON.stringify(steps),
      tags: JSON.stringify(tags),
    };
  }
}
