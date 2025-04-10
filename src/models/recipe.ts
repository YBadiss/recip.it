import db from '../db';

// Type definitions
export interface Recipe {
  id?: number;
  title: string;
  link: string;
  ingredients?: string;
  materials?: string;
  steps?: string;
  markdown?: string;
  created_at?: string;
  updated_at?: string;
  tags?: string[];
}

// Get all recipes with optional search parameters
export const getAllRecipes = (searchTerm?: string): Promise<Recipe[]> => {
  return new Promise((resolve, reject) => {
    let query = `
      SELECT r.*, GROUP_CONCAT(t.name) as tags
      FROM recipes r
      LEFT JOIN recipe_tags rt ON r.id = rt.recipe_id
      LEFT JOIN tags t ON rt.tag_id = t.id
    `;

    const params: any[] = [];

    if (searchTerm) {
      query += `
        WHERE r.title LIKE ?
        OR r.ingredients LIKE ?
        OR r.materials LIKE ?
        OR r.steps LIKE ?
        OR t.name LIKE ?
      `;
      const searchPattern = `%${searchTerm}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }

    query += `
      GROUP BY r.id
      ORDER BY r.updated_at DESC
    `;

    db.all(query, params, (err, rows: any[]) => {
      if (err) {
        reject(err);
        return;
      }

      // Process the rows to parse tags into an array if they exist
      const recipes = rows.map(row => {
        const recipe: Recipe = { ...row };
        if (row.tags) {
          recipe.tags = row.tags.split(',');
        } else {
          recipe.tags = [];
        }
        return recipe;
      });

      resolve(recipes);
    });
  });
};

// Get a single recipe by ID
export const getRecipeById = (id: number): Promise<Recipe | null> => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT r.*, GROUP_CONCAT(t.name) as tags
      FROM recipes r
      LEFT JOIN recipe_tags rt ON r.id = rt.recipe_id
      LEFT JOIN tags t ON rt.tag_id = t.id
      WHERE r.id = ?
      GROUP BY r.id
    `;

    db.get(query, [id], (err, row: any) => {
      if (err) {
        reject(err);
        return;
      }

      if (!row) {
        resolve(null);
        return;
      }

      // Process tags
      const recipe: Recipe = { ...row };
      if (row.tags) {
        recipe.tags = row.tags.split(',');
      } else {
        recipe.tags = [];
      }

      resolve(recipe);
    });
  });
};

// Create a new recipe
export const createRecipe = (recipe: Recipe): Promise<number> => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Begin transaction
      db.run('BEGIN TRANSACTION');

      // Insert recipe
      const insertRecipeQuery = `
        INSERT INTO recipes (title, link, ingredients, materials, steps, markdown)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      db.run(
        insertRecipeQuery,
        [
          recipe.title,
          recipe.link,
          recipe.ingredients || '',
          recipe.materials || '',
          recipe.steps || '',
          recipe.markdown || ''
        ],
        function(err) {
          if (err) {
            db.run('ROLLBACK');
            reject(err);
            return;
          }

          const recipeId = this.lastID;

          // If there are no tags, resolve with the recipe ID
          if (!recipe.tags || recipe.tags.length === 0) {
            db.run('COMMIT');
            resolve(recipeId);
            return;
          }

          // Insert tags and create associations
          const insertTagPromises = recipe.tags.map(tagName => insertTagAndAssociate(tagName, recipeId));

          Promise.all(insertTagPromises)
            .then(() => {
              db.run('COMMIT');
              resolve(recipeId);
            })
            .catch(err => {
              db.run('ROLLBACK');
              reject(err);
            });
        }
      );
    });
  });
};

// Update an existing recipe
export const updateRecipe = (id: number, recipe: Partial<Recipe>): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Begin transaction
      db.run('BEGIN TRANSACTION');

      // First, update the recipe
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      if (recipe.title !== undefined) {
        updateFields.push('title = ?');
        updateValues.push(recipe.title);
      }

      if (recipe.link !== undefined) {
        updateFields.push('link = ?');
        updateValues.push(recipe.link);
      }

      if (recipe.ingredients !== undefined) {
        updateFields.push('ingredients = ?');
        updateValues.push(recipe.ingredients);
      }

      if (recipe.materials !== undefined) {
        updateFields.push('materials = ?');
        updateValues.push(recipe.materials);
      }

      if (recipe.steps !== undefined) {
        updateFields.push('steps = ?');
        updateValues.push(recipe.steps);
      }

      if (recipe.markdown !== undefined) {
        updateFields.push('markdown = ?');
        updateValues.push(recipe.markdown);
      }

      if (updateFields.length === 0) {
        // If there are no fields to update but there are tags, continue to tag update
        if (!recipe.tags) {
          db.run('ROLLBACK');
          resolve();
          return;
        }
      } else {
        // Update the recipe
        const updateQuery = `UPDATE recipes SET ${updateFields.join(', ')} WHERE id = ?`;
        updateValues.push(id);

        db.run(updateQuery, updateValues, function(err) {
          if (err) {
            db.run('ROLLBACK');
            reject(err);
            return;
          }

          if (this.changes === 0) {
            db.run('ROLLBACK');
            reject(new Error(`Recipe with ID ${id} not found`));
            return;
          }
        });
      }

      // If there are tags to update
      if (recipe.tags) {
        const recipeTags = recipe.tags; // Create a new variable to help TypeScript track that it's defined
        
        // Clear existing tag associations
        db.run('DELETE FROM recipe_tags WHERE recipe_id = ?', [id], (err) => {
          if (err) {
            db.run('ROLLBACK');
            reject(err);
            return;
          }

          // If there are no new tags, commit and resolve
          if (recipeTags.length === 0) {
            db.run('COMMIT');
            resolve();
            return;
          }

          // Insert new tags and associations
          const insertTagPromises = recipeTags.map(tagName => insertTagAndAssociate(tagName, id));

          Promise.all(insertTagPromises)
            .then(() => {
              db.run('COMMIT');
              resolve();
            })
            .catch(err => {
              db.run('ROLLBACK');
              reject(err);
            });
        });
      } else {
        db.run('COMMIT');
        resolve();
      }
    });
  });
};

// Helper function to insert a tag if it doesn't exist and create an association with a recipe
const insertTagAndAssociate = (tagName: string, recipeId: number): Promise<void> => {
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