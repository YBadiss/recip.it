import { randomUUID } from 'node:crypto'
import type { Database } from './db.server'
import type { Recipe, RecipeContent, User, UserWithStats } from '#/lib/recipe'

interface RecipeRow {
  id: string
  title: string
  link: string
  ingredients: string
  materials: string
  steps: string
  tags: string
  imageUrl: string | null
  cookingTime: string | null
  servings: number | null
  created_at: string
  updated_at: string
}

interface UserRow {
  id: string
  username: string
  password: string
  authorized_endpoints: string
  created_at: string
}

export interface UserWithPassword extends User {
  passwordHash: string
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return (JSON.parse(value) as T | null) ?? fallback
  } catch {
    return fallback
  }
}

function toRecipe(row: RecipeRow): Recipe {
  // Older rows may lack step ingredient/material arrays.
  const storedSteps = parseJson<
    Array<{ action: string; ingredients?: string[]; materials?: string[] }>
  >(row.steps, [])
  const steps = storedSteps.map((step) => ({
    action: step.action,
    ingredients: step.ingredients ?? [],
    materials: step.materials ?? [],
  }))
  return {
    id: row.id,
    title: row.title,
    link: row.link,
    ingredients: parseJson(row.ingredients, []),
    materials: parseJson(row.materials, []),
    steps,
    tags: parseJson(row.tags, []),
    imageUrl: row.imageUrl ?? '',
    cookingTime: row.cookingTime ?? '',
    servings: row.servings ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function toUser(row: UserRow): UserWithPassword {
  // Admins were the users granted every endpoint ("*") by the old API.
  const endpoints = parseJson<string[]>(row.authorized_endpoints, [])
  return {
    id: row.id,
    username: row.username,
    isAdmin: endpoints.includes('*'),
    created_at: row.created_at,
    passwordHash: row.password,
  }
}

function withoutPassword({ passwordHash: _, ...user }: UserWithPassword): User {
  return user
}

export class Store {
  constructor(private readonly db: Database) {}

  // Recipes

  listRecipes(): Recipe[] {
    const rows = this.db
      .prepare('SELECT * FROM recipes ORDER BY updated_at DESC')
      .all()
    return (rows as unknown as RecipeRow[]).map(toRecipe)
  }

  getRecipe(id: string): Recipe | null {
    const row = this.db.prepare('SELECT * FROM recipes WHERE id = ?').get(id)
    return row ? toRecipe(row as unknown as RecipeRow) : null
  }

  getRecipeByLink(link: string): Recipe | null {
    const row = this.db
      .prepare('SELECT * FROM recipes WHERE link = ?')
      .get(link)
    return row ? toRecipe(row as unknown as RecipeRow) : null
  }

  /** Inserts the recipe, or returns the existing one if another import of the same link won the race. */
  createRecipe(link: string, content: RecipeContent): Recipe {
    const id = randomUUID()
    const result = this.db
      .prepare(
        `INSERT INTO recipes (id, title, link, ingredients, materials, steps, tags, imageUrl, cookingTime, servings)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT DO NOTHING`,
      )
      .run(
        id,
        content.title,
        link,
        JSON.stringify(content.ingredients),
        JSON.stringify(content.materials),
        JSON.stringify(content.steps),
        JSON.stringify(content.tags),
        content.imageUrl,
        content.cookingTime,
        content.servings,
      )
    const recipe = result.changes
      ? this.getRecipe(id)
      : this.getRecipeByLink(link)
    if (!recipe) throw new Error('Failed to save recipe')
    return recipe
  }

  updateRecipe(id: string, content: RecipeContent): Recipe {
    this.db
      .prepare(
        `UPDATE recipes SET title = ?, ingredients = ?, materials = ?, steps = ?, tags = ?, imageUrl = ?,
         cookingTime = ?, servings = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      )
      .run(
        content.title,
        JSON.stringify(content.ingredients),
        JSON.stringify(content.materials),
        JSON.stringify(content.steps),
        JSON.stringify(content.tags),
        content.imageUrl,
        content.cookingTime,
        content.servings,
        id,
      )
    const recipe = this.getRecipe(id)
    if (!recipe) throw new Error('Recipe not found')
    return recipe
  }

  deleteRecipe(id: string): void {
    this.db.prepare('DELETE FROM user_recipes WHERE recipe_id = ?').run(id)
    this.db.prepare('DELETE FROM recipes WHERE id = ?').run(id)
  }

  // Users

  createUser(username: string, passwordHash: string): User {
    const id = randomUUID()
    try {
      this.db
        .prepare(
          'INSERT INTO users (id, username, password, authorized_endpoints) VALUES (?, ?, ?, ?)',
        )
        .run(id, username, passwordHash, '[]')
    } catch (error) {
      if (String(error).includes('UNIQUE constraint failed'))
        throw new Error('Username already exists')
      throw error
    }
    const user = this.getUser(id)
    if (!user) throw new Error('Failed to create user')
    return user
  }

  getUser(id: string): User | null {
    const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id)
    return row ? withoutPassword(toUser(row as unknown as UserRow)) : null
  }

  getUserWithPassword(username: string): UserWithPassword | null {
    const row = this.db
      .prepare('SELECT * FROM users WHERE username = ?')
      .get(username)
    return row ? toUser(row as unknown as UserRow) : null
  }

  listUsers(): UserWithStats[] {
    const rows = this.db
      .prepare(
        `SELECT users.*, COUNT(user_recipes.id) AS recipeCount FROM users
         LEFT JOIN user_recipes ON user_recipes.user_id = users.id
         GROUP BY users.id ORDER BY users.username`,
      )
      .all() as unknown as Array<UserRow & { recipeCount: number }>
    return rows.map((row) => ({
      ...withoutPassword(toUser(row)),
      recipeCount: row.recipeCount,
    }))
  }

  // Collections

  userRecipeIds(userId: string): Set<string> {
    const rows = this.db
      .prepare('SELECT recipe_id FROM user_recipes WHERE user_id = ?')
      .all(userId)
    return new Set(
      (rows as unknown as Array<{ recipe_id: string }>).map((r) => r.recipe_id),
    )
  }

  userHasRecipe(userId: string, recipeId: string): boolean {
    return !!this.db
      .prepare('SELECT 1 FROM user_recipes WHERE user_id = ? AND recipe_id = ?')
      .get(userId, recipeId)
  }

  addToCollection(userId: string, recipeId: string): void {
    this.db
      .prepare(
        'INSERT INTO user_recipes (id, user_id, recipe_id) VALUES (?, ?, ?) ON CONFLICT(user_id, recipe_id) DO NOTHING',
      )
      .run(randomUUID(), userId, recipeId)
  }

  removeFromCollection(userId: string, recipeId: string): void {
    this.db
      .prepare('DELETE FROM user_recipes WHERE user_id = ? AND recipe_id = ?')
      .run(userId, recipeId)
  }
}
