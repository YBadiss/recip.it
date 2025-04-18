import axios from 'axios';
import { Recipe, User } from '../utils/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API functions for users
export const getUsers = async (): Promise<User[]> => {
  const response = await api.get('/users/list');
  return response.data.users;
};

// API functions for recipes
export const getRecipes = async (): Promise<Recipe[]> => {
  const response = await api.get('/recipes');
  // Handle both possible API response formats
  return response.data.recipes;
};

export const reimportRecipe = async (id: string): Promise<Recipe> => {
  const response = await api.post(`/recipes/${id}/reimport`);
  return response.data.recipe;
};

export const deleteRecipe = async (id: string): Promise<void> => {
  await api.delete(`/recipes/${id}`);
};

// Intercept 401 responses and redirect to login
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
