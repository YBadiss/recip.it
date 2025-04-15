import { v4 as uuidv4 } from 'uuid';
import sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';
import { User, UserWithoutPassword } from './user';

interface UserRow {
  id: string;
  username: string;
  password: string;
  authorized_endpoints: string;
  created_at: string;
  updated_at: string;
}

export class UserStore {
  private dbConnection: sqlite3.Database;

  constructor(dbConnection: sqlite3.Database) {
    this.dbConnection = dbConnection;
  }

  // Create a new user with hashed password
  async createUser(
    username: string,
    password: string,
    authorizedEndpoints: string[]
  ): Promise<string> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    return await new Promise((resolve, reject) => {
      try {
        this.dbConnection.run(
          `INSERT INTO users (id, username, password, authorized_endpoints) 
           VALUES (?, ?, ?, ?)`,
          [userId, username, hashedPassword, JSON.stringify(authorizedEndpoints)],
          function (err) {
            if (err) {
              if (err.message.includes('UNIQUE constraint failed: users.username')) {
                reject(new Error('Username already exists'));
              } else {
                reject(err);
              }
              return;
            }
            resolve(userId);
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  // Get a user by username (with password for authentication)
  async getUserByUsername(username: string): Promise<User | null> {
    return new Promise((resolve, reject) => {
      this.dbConnection.get(
        'SELECT id, username, password, authorized_endpoints, created_at, updated_at FROM users WHERE username = ?',
        [username],
        (err, row: UserRow | undefined) => {
          if (err) {
            reject(err);
            return;
          }
          if (!row) {
            resolve(null);
            return;
          }

          resolve({
            id: row.id,
            username: row.username,
            password: row.password,
            authorizedEndpoints: JSON.parse(row.authorized_endpoints),
            created_at: row.created_at,
            updated_at: row.updated_at,
          });
        }
      );
    });
  }

  // Get a user by ID (without password for security)
  async getUserById(id: string): Promise<UserWithoutPassword | null> {
    return new Promise((resolve, reject) => {
      this.dbConnection.get(
        'SELECT id, username, authorized_endpoints, created_at, updated_at FROM users WHERE id = ?',
        [id],
        (err, row: UserRow | undefined) => {
          if (err) {
            reject(err);
            return;
          }
          if (!row) {
            resolve(null);
            return;
          }

          resolve({
            id: row.id,
            username: row.username,
            authorizedEndpoints: JSON.parse(row.authorized_endpoints),
            created_at: row.created_at,
            updated_at: row.updated_at,
          });
        }
      );
    });
  }

  // Get all users (without exposing passwords)
  async getAllUsers(): Promise<UserWithoutPassword[]> {
    return new Promise((resolve, reject) => {
      this.dbConnection.all(
        'SELECT id, username, authorized_endpoints, created_at, updated_at FROM users ORDER BY username',
        (err, rows: UserRow[]) => {
          if (err) {
            reject(err);
            return;
          }

          const users = rows.map(row => ({
            id: row.id,
            username: row.username,
            authorizedEndpoints: JSON.parse(row.authorized_endpoints),
            created_at: row.created_at,
            updated_at: row.updated_at,
          }));

          resolve(users);
        }
      );
    });
  }

  // Validate user credentials
  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user) {
      return null;
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }
    return user;
  }

  // Add a recipe to a user's collection
  async addRecipeToUser(userId: string, recipeId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const userRecipeId = uuidv4();

      this.dbConnection.run(
        `INSERT INTO user_recipes (id, user_id, recipe_id) 
         VALUES (?, ?, ?)
         ON CONFLICT(user_id, recipe_id) DO NOTHING`,
        [userRecipeId, userId, recipeId],
        function (err) {
          if (err) {
            reject(err);
            return;
          }
          resolve(userRecipeId);
        }
      );
    });
  }

  // Remove a recipe from a user's collection
  async removeRecipeFromUser(userId: string, recipeId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.dbConnection.run(
        'DELETE FROM user_recipes WHERE user_id = ? AND recipe_id = ?',
        [userId, recipeId],
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

  // Get all recipes for a user
  async getUserRecipes(userId: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      this.dbConnection.all(
        'SELECT recipe_id FROM user_recipes WHERE user_id = ?',
        [userId],
        (err, rows: { recipe_id: string }[]) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(rows.map(row => row.recipe_id));
        }
      );
    });
  }

  // Check if a user has access to a specific recipe
  async userHasRecipe(userId: string, recipeId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.dbConnection.get(
        'SELECT 1 FROM user_recipes WHERE user_id = ? AND recipe_id = ?',
        [userId, recipeId],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(!!row);
        }
      );
    });
  }

  // Remove a recipe from all users' collections
  async removeRecipeFromAllUsers(recipeId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.dbConnection.run('DELETE FROM user_recipes WHERE recipe_id = ?', [recipeId], err => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }
}
