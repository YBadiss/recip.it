import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthState, createServices } from '@recipit/core';

// Use the createServices factory to get properly initialized services
const { authService } = createServices(import.meta.env.VITE_API_URL || '/api');

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  redirectToLogin: (returnPath?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>(authService.getState());
  const navigate = useNavigate();

  // Function to redirect to login page with return path
  const redirectToLogin = useCallback(
    (returnPath?: string) => {
      // If no path is provided, use current location including search params
      const path = returnPath || window.location.pathname + window.location.search;
      // Make sure we're using the correct state structure as expected by LoginPage
      navigate('/login', { state: { from: { pathname: path } } });
    },
    [navigate]
  );

  // Set the auth redirect handler on mount
  useEffect(() => {
    authService.setRedirectHandler(redirectToLogin);
  }, [redirectToLogin]);

  // Subscribe to state changes from the authService
  useEffect(() => {
    const unsubscribe = authService.subscribe(setState);
    return unsubscribe;
  }, []);

  const login = async (username: string, password: string) => {
    await authService.login(username, password);
  };

  const register = async (username: string, password: string) => {
    await authService.register(username, password);
  };

  const logout = async () => {
    try {
      await authService.logout();
      // Redirect to home page after logout
      navigate('/', { replace: true });
    } catch (error) {
      // Still redirect to home page on error
      navigate('/', { replace: true });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        redirectToLogin,
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
