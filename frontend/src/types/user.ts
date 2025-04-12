export interface UserResponse {
  user: User;
}

export interface User {
  id: string;
  username: string;
  authorizedEndpoints: string[];
  created_at?: string;
  updated_at?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  password: string;
} 