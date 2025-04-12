// Type definitions for recipe components

export interface Ingredient {
  id: string; // Unique identifier for the ingredient
  name: string;
  quantity?: string;
  unit?: string;
}

export interface Material {
  id: string; // Unique identifier for the material
  name: string;
  description?: string;
}

export interface Step {
  action: string;
  ingredients?: string[]; // Array of ingredient IDs
  materials?: string[]; // Array of material IDs
}
// Type definitions for recipes

export interface Recipe {
  id?: string; // Changed from number to string for UUID
  title: string;
  link: string;
  ingredients?: Ingredient[];
  materials?: Material[];
  steps?: Step[];
  created_at?: string;
  updated_at?: string;
  tags?: string[];
  imageUrl?: string;
  cookingTime?: string; // Total time to prepare and cook the recipe
  servings?: number; // Number of people the recipe serves
}
