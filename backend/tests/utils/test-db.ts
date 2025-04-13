import sqlite3 from 'sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { initDatabase } from '../../src/db/migrate';
import os from 'os';

// Database utilities for tests
export class TestDatabase {
  private db: sqlite3.Database | null = null;
  private dbPath: string;

  constructor() {
    // Create a unique database file in the system temp directory
    const dbId = uuidv4();
    // Use OS temp directory for better isolation
    const tempDir = os.tmpdir();
    const testDbDir = path.join(tempDir, 'recip-it-tests');

    // Ensure test directory exists
    if (!fs.existsSync(testDbDir)) {
      fs.mkdirSync(testDbDir, { recursive: true });
    }

    this.dbPath = path.join(testDbDir, `test-${dbId}.db`);

    // Delete the file if it already exists (ensuring a clean state)
    if (fs.existsSync(this.dbPath)) {
      fs.unlinkSync(this.dbPath);
    }
  }

  // Initialize the database with schema using the real initialization function
  async init(): Promise<void> {
    // First make sure there's no existing database
    if (fs.existsSync(this.dbPath)) {
      fs.unlinkSync(this.dbPath);
    }

    return new Promise((resolve, reject) => {
      // Create a completely new database connection
      this.db = new sqlite3.Database(this.dbPath, async err => {
        if (err) {
          reject(err);
          return;
        }

        try {
          // Use the real database initialization code with our custom path
          await initDatabase(this.dbPath);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  // Get the database connection
  getDb(): sqlite3.Database {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
    return this.db;
  }

  // Get the database path
  getDbPath(): string {
    return this.dbPath;
  }

  // Close and cleanup the database
  async cleanup(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }

      this.db.close(err => {
        if (err) {
          reject(err);
          return;
        }

        // Delete the test database file
        try {
          if (fs.existsSync(this.dbPath)) {
            fs.unlinkSync(this.dbPath);
          }
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }
}
