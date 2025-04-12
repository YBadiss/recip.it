// Type definitions for users

export interface User {
  id?: string; // UUID
  username: string;
  password: string; // Hashed password
  authorizedEndpoints: string[];
  created_at?: string;
  updated_at?: string;
}

export interface UserWithoutPassword {
  id: string;
  username: string;
  authorizedEndpoints: string[];
  created_at?: string;
  updated_at?: string;
}
