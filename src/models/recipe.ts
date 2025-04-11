import { v4 as uuidv4 } from 'uuid';
import db from '../db';

// Type definitions for recipe components
export interface Ingredient {
  id: string;  // Unique identifier for the ingredient
  name: string;
  quantity?: string;
  unit?: string;
}

export interface Material {
  id: string;  // Unique identifier for the material
  name: string;
  description?: string;
}

export interface Step {
  action: string;
  ingredients?: string[];  // Array of ingredient IDs
  materials?: string[];   // Array of material IDs
}

// Type definitions for recipes
export interface Recipe {
  id?: string;  // Changed from number to string for UUID
  title: string;
  link: string;
  ingredients?: Ingredient[];
  materials?: Material[];
  steps?: Step[];
  created_at?: string;
  updated_at?: string;
  tags?: string[];
}

// Get all recipes with optional search parameters
export const getAllRecipes = async (searchTerm?: string): Promise<Recipe[]> => {
  return new Promise((resolve, reject) => {
    if (searchTerm) {
      searchRecipes(searchTerm)
        .then(resolve)
        .catch(reject);
    } else {
      db.all('SELECT * FROM recipes ORDER BY updated_at DESC', (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows.map(parseRecipe));
      });
    }
  });
};

// Get a single recipe by ID
export const getRecipeById = async (id: string): Promise<Recipe | null> => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM recipes WHERE id = ?', [id], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row ? parseRecipe(row) : null);
    });
  });
};

// Get a recipe by link
export const getRecipeByLink = async (link: string): Promise<Recipe | null> => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM recipes WHERE link = ?', [link], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row ? parseRecipe(row) : null);
    });
  });
};

// Create a new recipe
export const createRecipe = async (recipe: Recipe): Promise<string> => {
  return new Promise((resolve, reject) => {
    const recipeId = uuidv4();
    const preparedRecipe = prepareRecipeForDb({ ...recipe, id: recipeId });
    
    db.run(
      `INSERT INTO recipes (id, title, link, ingredients, materials, steps, tags) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        preparedRecipe.id,
        preparedRecipe.title,
        preparedRecipe.link,
        preparedRecipe.ingredients,
        preparedRecipe.materials,
        preparedRecipe.steps,
        preparedRecipe.tags
      ],
      function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(recipeId);
      }
    );
  });
};

// Update an existing recipe
export const updateRecipe = async (id: string, recipe: Partial<Recipe>): Promise<void> => {
  return new Promise((resolve, reject) => {
    const preparedRecipe = prepareRecipeForDb(recipe as Recipe);
    const updates: string[] = [];
    const values: any[] = [];

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
    db.run(
      `UPDATE recipes SET ${updates.join(', ')} WHERE id = ?`,
      values,
      (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      }
    );
  });
};

// Delete a recipe by ID
export const deleteRecipe = (id: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM recipes WHERE id = ?', [id], (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
};

// Helper function to insert a tag if it doesn't exist and create an association with a recipe
const insertTagAndAssociate = (tagName: string, recipeId: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    // First, try to insert the tag if it doesn't exist
    db.run('INSERT OR IGNORE INTO tags (name) VALUES (?)', [tagName], function(err) {
      if (err) {
        reject(err);
        return;
      }

      // Get the tag ID (whether it was just inserted or already existed)
      db.get('SELECT id FROM tags WHERE name = ?', [tagName], (err, row: any) => {
        if (err) {
          reject(err);
          return;
        }

        if (!row) {
          reject(new Error(`Failed to get tag ID for tag: ${tagName}`));
          return;
        }

        const tagId = row.id;

        // Create the association between recipe and tag
        db.run(
          'INSERT OR IGNORE INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)',
          [recipeId, tagId],
          (err) => {
            if (err) {
              reject(err);
              return;
            }
            resolve();
          }
        );
      });
    });
  });
};

// Function to search recipes
export const searchRecipes = async (query: string): Promise<Recipe[]> => {
  return new Promise((resolve, reject) => {
    // Remove common stop words and punctuation from the query
    const cleanQuery = query.toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .split(' ')
      .filter(word => word.length > 1) // Filter out single characters
      .join(' ');
      
    // Build search terms with wildcards
    const searchTerms = cleanQuery.split(' ')
      .map(term => `%${term}%`)
      .join(' ');
      
    db.all(`
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
      resolve(rows.map(parseRecipe));
    });
  });
};

// Helper function to parse recipe from database row
const parseRecipe = (row: any): Recipe => {
  return {
    id: row.id,
    title: row.title,
    link: row.link,
    ingredients: JSON.parse(row.ingredients),
    materials: JSON.parse(row.materials),
    steps: JSON.parse(row.steps),
    tags: JSON.parse(row.tags),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
};

// Helper function to prepare recipe for database insertion
const prepareRecipeForDb = (recipe: Recipe): any => {
  // Ensure all JSON fields have default values
  const ingredients = recipe.ingredients || [];
  const materials = recipe.materials || [];
  const steps = recipe.steps || [];
  const tags = recipe.tags || [];
  
  try {
    return {
      ...recipe,
      ingredients: JSON.stringify(ingredients),
      materials: JSON.stringify(materials),
      steps: JSON.stringify(steps),
      tags: JSON.stringify(tags)
    };
  } catch (error) {
    console.error('Error stringifying recipe data:', error);
    console.error('Problematic recipe:', JSON.stringify({
      id: recipe.id,
      title: recipe.title,
      link: recipe.link,
      ingredients: ingredients.length,
      materials: materials.length,
      steps: steps.length,
      tags: tags.length
    }));
    throw new Error(`Failed to prepare recipe data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}; 