import axios from 'axios';
import { AuthResponse, User } from '../utils/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Create axios instance
const authApi = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const login = async (username: string, password: string): Promise<User> => {
  const response = await authApi.post<AuthResponse>('/users/login', {
    username,
    password,
  });

  return response.data.user;
};

export const logout = async (): Promise<void> => {
  await authApi.post('/users/logout');
  localStorage.removeItem('user');
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const response = await authApi.get<{ user: User }>('/users/profile');
    return response.data.user;
  } catch (error) {
    return null;
  }
};

export const isAuthenticated = async (): Promise<boolean> => {
  const user = await getCurrentUser();
  return user !== null;
};

export const hasAdminAccess = (user: User | null): boolean => {
  if (!user) return false;

  // Check if user has admin permissions
  const adminEndpoints = ['*'];

  return adminEndpoints.every(endpoint => user.authorizedEndpoints.includes(endpoint));
};

export default {
  login,
  logout,
  getCurrentUser,
  isAuthenticated,
  hasAdminAccess,
};
