import sqlite3 from 'sqlite3';
import path from 'path';
import { initDatabase, getDatabase } from './migrate';

// Initialize the database
initDatabase()
  .then(() => {
    console.log('Database initialized successfully');
  })
  .catch((err) => {
    console.error('Database initialization failed:', err);
    process.exit(1);
  });

// Get the database connection
const db = getDatabase();

// Export database connection
export default db; 