export interface Ingredient {
  id: string;
  name: string;
  quantity?: string;
  unit?: string;
}

export interface Material {
  id: string;
  name: string;
  description?: string;
}

export interface Step {
  action: string;
  ingredients?: string[]; // Array of ingredient IDs
  materials?: string[]; // Array of material IDs
}

export interface Recipe {
  id?: string;
  title: string;
  link: string;
  description?: string;
  imageUrl?: string;
  cookTime?: string;
  cookingTime?: string;
  servings?: number;
  ingredients?: Ingredient[];
  materials?: Material[];
  steps?: Step[];
  created_at?: string;
  updated_at?: string;
  tags?: string[];
  inUserList?: boolean;
}

export interface RecipeImport {
  link: string;
}
