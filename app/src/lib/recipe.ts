// Recipe types shared by the server and the UI.

export interface Ingredient {
  id: string
  name: string
  quantity?: string
  unit?: string
}

export interface Material {
  id: string
  name: string
  description?: string
}

export interface Step {
  action: string
  /** Ingredient ids used in this step. */
  ingredients: string[]
  /** Material ids used in this step. */
  materials: string[]
}

/** What extraction produces, before the recipe is stored. */
export interface RecipeContent {
  title: string
  ingredients: Ingredient[]
  materials: Material[]
  steps: Step[]
  tags: string[]
  imageUrl: string
  cookingTime: string
  servings: number
}

export interface Recipe extends RecipeContent {
  id: string
  /** Normalized source URL, or `file://upload/<md5>` for uploaded files. */
  link: string
  created_at: string
  updated_at: string
}

export interface RecipeWithOwnership extends Recipe {
  /** Whether the recipe is in the current user's collection. */
  inUserList: boolean
}

export interface User {
  id: string
  username: string
  isAdmin: boolean
  created_at: string
}

export interface UserWithStats extends User {
  recipeCount: number
}

export function isFileLink(link: string): boolean {
  return link.startsWith('file://')
}
