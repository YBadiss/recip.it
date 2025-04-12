import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthState } from '../types/user';
import { authApi } from '../services/api';

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const defaultAuthState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>(defaultAuthState);

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      // Check if token exists in localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        setState({
          ...defaultAuthState,
          isLoading: false,
        });
        return;
      }

      try {
        const user = await authApi.getCurrentUser();
        
        // Ensure we have a valid user object
        if (user && user.id) {
          setState({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } else {
          // If we got a response but no valid user, clean up and set not authenticated
          console.error('No valid user data returned from profile endpoint');
          localStorage.removeItem('token');
          setState({
            ...defaultAuthState,
            isLoading: false,
          });
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        // On error, clear token and set not authenticated
        localStorage.removeItem('token');
        setState({
          ...defaultAuthState,
          isLoading: false,
        });
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (username: string, password: string) => {
    setState({ ...state, isLoading: true, error: null });
    try {
      const user = await authApi.login({ username, password });
      
      // Verify we have a valid user object
      if (user && user.id) {
        setState({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } else {
        throw new Error('Invalid user data received from server');
      }
    } catch (error) {
      setState({
        ...state,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      });
      throw error;
    }
  };

  const register = async (username: string, password: string) => {
    setState({ ...state, isLoading: true, error: null });
    try {
      const user = await authApi.register({ username, password });
      
      // Verify we have a valid user object
      if (user && user.id) {
        setState({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } else {
        throw new Error('Invalid user data received from server');
      }
    } catch (error) {
      setState({
        ...state,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      });
      throw error;
    }
  };

  const logout = async () => {
    setState({ ...state, isLoading: true });
    try {
      await authApi.logout();
      setState({
        ...defaultAuthState,
        isLoading: false,
      });
    } catch (error) {
      // Even if logout fails on server, clear local state
      localStorage.removeItem('token');
      setState({
        ...defaultAuthState,
        isLoading: false,
      });
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 