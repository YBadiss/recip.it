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
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export class RecipeStore {
  private dbConnection: sqlite3.Database;

  constructor(dbConnection: sqlite3.Database) {
    this.dbConnection = dbConnection;
  }

  // Get all recipes with optional search parameters
  async getAllRecipes(searchTerm?: string): Promise<Recipe[]> {
    return new Promise((resolve, reject) => {
      if (searchTerm) {
        this.searchRecipes(searchTerm).then(resolve).catch(reject);
      } else {
        this.dbConnection.all('SELECT * FROM recipes ORDER BY updated_at DESC', (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(rows.map(row => this.parseRecipe(row as DbRow)));
        });
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

  // Create a new recipe
  async createRecipe(recipe: Recipe): Promise<string> {
    return new Promise((resolve, reject) => {
      const recipeId = uuidv4();
      const preparedRecipe = this.prepareRecipeForDb({ ...recipe, id: recipeId });

      this.dbConnection.run(
        `INSERT INTO recipes (id, title, link, ingredients, materials, steps, tags) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          preparedRecipe.id,
          preparedRecipe.title,
          preparedRecipe.link,
          preparedRecipe.ingredients,
          preparedRecipe.materials,
          preparedRecipe.steps,
          preparedRecipe.tags,
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

      if (updates.length === 0) {
        resolve();
        return;
      }

      values.push(id);
      this.dbConnection.run(`UPDATE recipes SET ${updates.join(', ')} WHERE id = ?`, values, err => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
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
  async searchRecipes(query: string): Promise<Recipe[]> {
    return new Promise((resolve, reject) => {
      // Remove common stop words and punctuation from the query
      const cleanQuery = query
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .split(' ')
        .filter(word => word.length > 1) // Filter out single characters
        .join(' ');

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
      `,
        [`%${cleanQuery}%`, `${query}`, `%${query}%`],
        (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(rows.map(row => this.parseRecipe(row as DbRow)));
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