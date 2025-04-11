import { initDatabase } from '../db/migrate';

/**
 * This script runs database migrations manually
 * It creates/updates the database schema and triggers
 */
const runMigrations = async (): Promise<void> => {
  console.log('Running database migrations...');
  
  try {
    await initDatabase();
    console.log('Database migrations completed successfully!');
  } catch (error) {
    console.error('Error running migrations:', error);
    throw error;
  }
};

// Execute the script
runMigrations()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Script failed:', err);
    process.exit(1);
  }); 