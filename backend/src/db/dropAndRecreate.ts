import fs from 'fs';
import { Config } from '../config';
import { initDatabase } from './migrate';

// Function to drop and recreate the database
const dropAndRecreateDatabase = async (dbPath: string): Promise<void> => {
  // Check if the file exists and delete it
  if (fs.existsSync(dbPath)) {
    console.log(`Dropping existing database at ${dbPath}`);
    fs.unlinkSync(dbPath);
  }

  // Create the database with the new schema
  console.log('Creating new database with updated schema');
  await initDatabase(dbPath);
  console.log('Database recreated successfully!');
};

// Execute the function if this script is run directly
if (require.main === module) {
  const dbPath = Config.DB_PATH;
  dropAndRecreateDatabase(dbPath)
    .then(() => {
      console.log('Database migration completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error during database migration:', error);
      process.exit(1);
    });
}

export default dropAndRecreateDatabase;
