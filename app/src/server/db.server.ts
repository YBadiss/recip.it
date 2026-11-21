import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { config } from './config.server'

export type Database = DatabaseSync

// Same tables as the previous Express backend, so an existing recipes.db keeps working.
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS recipes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    link TEXT NOT NULL,
    ingredients JSON NOT NULL,
    materials JSON NOT NULL,
    steps JSON NOT NULL,
    tags JSON NOT NULL,
    imageUrl TEXT,
    cookingTime TEXT,
    servings INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    authorized_endpoints JSON NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS user_recipes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    recipe_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    UNIQUE (user_id, recipe_id)
  );
  CREATE INDEX IF NOT EXISTS idx_user_recipes_user_id ON user_recipes(user_id);
  CREATE INDEX IF NOT EXISTS idx_user_recipes_recipe_id ON user_recipes(recipe_id);
`

export function openDatabase(file: string): Database {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true })
  const db = new DatabaseSync(file)
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;')
  db.exec(SCHEMA)
  ensureUniqueLinks(db)
  return db
}

// Links identify recipes. Older databases may hold duplicates, in which case a plain index is used.
function ensureUniqueLinks(db: Database) {
  try {
    db.exec(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_recipes_link_unique ON recipes(link)',
    )
  } catch (error) {
    console.warn(
      'Duplicate recipe links found, recipes.link is not unique:',
      error,
    )
    db.exec('CREATE INDEX IF NOT EXISTS idx_recipes_link ON recipes(link)')
  }
}

let instance: Database | undefined

export function getDb(): Database {
  instance ??= openDatabase(config.dbPath)
  return instance
}
