import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

// Database configuration
const dbPath = path.join(__dirname, '../../data/recipes.db');

// Initialize database
export const initDatabase = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Create database directory if it doesn't exist
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }

      // Enable foreign keys
      db.run('PRAGMA foreign_keys = ON');

      // Create schema
      db.serialize(() => {
        // Create recipes table
        db.run(`
          CREATE TABLE IF NOT EXISTS recipes (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            link TEXT NOT NULL,
            ingredients JSON NOT NULL,
            materials JSON NOT NULL,
            steps JSON NOT NULL,
            tags JSON NOT NULL,
            search_text TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) {
            reject(err);
            return;
          }
          
          // Create index on search_text for faster searching
          db.run(`
            CREATE INDEX IF NOT EXISTS idx_recipes_search_text ON recipes(search_text)
          `, (err) => {
            if (err) {
              reject(err);
              return;
            }
            
            // Create trigger to update search_text on insert
            db.run(`
              CREATE TRIGGER IF NOT EXISTS update_search_text_insert
              AFTER INSERT ON recipes
              FOR EACH ROW
              BEGIN
                UPDATE recipes
                SET search_text = (
                  NEW.title || ' ' ||
                  (SELECT group_concat(json_extract(value, '$.name'), ' ') FROM json_each(NEW.ingredients)) || ' ' ||
                  (SELECT group_concat(json_extract(value, '$.name'), ' ') FROM json_each(NEW.materials)) || ' ' ||
                  (SELECT group_concat(json_extract(value, '$.action'), ' ') FROM json_each(NEW.steps)) || ' ' ||
                  (SELECT group_concat(value, ' ') FROM json_each(NEW.tags))
                )
                WHERE id = NEW.id;
              END;
            `, (err) => {
              if (err) {
                reject(err);
                return;
              }
              
              // Create trigger to update search_text on update
              db.run(`
                CREATE TRIGGER IF NOT EXISTS update_search_text_update
                AFTER UPDATE ON recipes
                FOR EACH ROW
                WHEN NEW.title != OLD.title OR 
                     NEW.ingredients != OLD.ingredients OR
                     NEW.materials != OLD.materials OR
                     NEW.steps != OLD.steps OR
                     NEW.tags != OLD.tags
                BEGIN
                  UPDATE recipes
                  SET search_text = (
                    NEW.title || ' ' ||
                    (SELECT group_concat(json_extract(value, '$.name'), ' ') FROM json_each(NEW.ingredients)) || ' ' ||
                    (SELECT group_concat(json_extract(value, '$.name'), ' ') FROM json_each(NEW.materials)) || ' ' ||
                    (SELECT group_concat(json_extract(value, '$.action'), ' ') FROM json_each(NEW.steps)) || ' ' ||
                    (SELECT group_concat(value, ' ') FROM json_each(NEW.tags))
                  )
                  WHERE id = NEW.id;
                END;
              `, (err) => {
                if (err) {
                  reject(err);
                  return;
                }
                resolve();
              });
            });
          });
        });
      });
    });
  });
};

// Get database connection
export const getDatabase = (): sqlite3.Database => {
  return new sqlite3.Database(dbPath);
};

// Close database connection
export const closeDatabase = (db: sqlite3.Database): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}; 