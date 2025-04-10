import db from './index';

// Function to run migrations
const runMigrations = async () => {
  return new Promise<void>((resolve, reject) => {
    db.serialize(() => {
      // Create recipes table
      db.run(`
        CREATE TABLE IF NOT EXISTS recipes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          link TEXT NOT NULL,
          ingredients TEXT,
          materials TEXT,
          steps TEXT,
          markdown TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating recipes table:', err.message);
          reject(err);
          return;
        }
      });

      // Create tags table
      db.run(`
        CREATE TABLE IF NOT EXISTS tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE
        )
      `, (err) => {
        if (err) {
          console.error('Error creating tags table:', err.message);
          reject(err);
          return;
        }
      });

      // Create recipe_tags join table
      db.run(`
        CREATE TABLE IF NOT EXISTS recipe_tags (
          recipe_id INTEGER,
          tag_id INTEGER,
          PRIMARY KEY (recipe_id, tag_id),
          FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
          FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('Error creating recipe_tags table:', err.message);
          reject(err);
          return;
        }
      });

      // Create a trigger to update the updated_at timestamp
      db.run(`
        CREATE TRIGGER IF NOT EXISTS update_recipes_timestamp
        AFTER UPDATE ON recipes
        BEGIN
          UPDATE recipes SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END
      `, (err) => {
        if (err) {
          console.error('Error creating timestamp trigger:', err.message);
          reject(err);
          return;
        }
        console.log('Database migrations completed successfully');
        resolve();
      });
    });
  });
};

// Run migrations and close the database
runMigrations()
  .then(() => {
    console.log('Migrations complete');
    db.close();
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });

// Export for testing
export default runMigrations; 