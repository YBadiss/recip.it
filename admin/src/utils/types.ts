export interface User {
  id: string;
  username: string;
  authorizedEndpoints: string[];
  recipeCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Ingredient {
  name: string;
  quantity?: string;
  unit?: string;
}

export interface Material {
  name: string;
  quantity?: string;
}

export interface Step {
  description: string;
  imageUrl?: string;
}

export interface Recipe {
  id?: string;
  title: string;
  link: string;
  ingredients?: Ingredient[];
  materials?: Material[];
  steps?: Step[];
  created_at?: string;
  updated_at?: string;
  tags?: string[];
  imageUrl?: string;
  cookingTime?: string;
  servings?: number;
  inUserList?: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ApiError {
  error: string;
}
