import { useEffect, useState } from 'react';
import { Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import UsersPage from './pages/UsersPage';
import RecipesPage from './pages/RecipesPage';
import { User } from './utils/types';
import { getCurrentUser, hasAdminAccess } from './services/auth';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Authentication error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  const isAdmin = hasAdminAccess(user);

  // Redirect non-admin users or unauthenticated users to login
  if (!user && location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }

  // Redirect non-admin authenticated users trying to access admin pages
  if (user && !isAdmin && ['/users', '/recipes'].includes(location.pathname)) {
    // If they're not an admin, show them some message or redirect them elsewhere
    return (
      <div>
        <h1>Access Denied</h1>
        <p>You do not have admin privileges.</p>
      </div>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/users" replace /> : <LoginPage setUser={setUser} />}
        />

        <Route element={<Layout user={user} isAdmin={isAdmin} />}>
          <Route path="/" element={<Navigate to="/users" replace />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/recipes" element={<RecipesPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/users" replace />} />
      </Routes>
    </ThemeProvider>
  );
}

export default App;
