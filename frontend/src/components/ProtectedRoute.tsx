import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner, Container } from 'react-bootstrap';

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading, redirectToLogin } = useAuth();
  const location = useLocation();

  // Redirect to login if the user attempts to access a protected route
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      redirectToLogin(location.pathname);
    }
  }, [isLoading, isAuthenticated, redirectToLogin, location.pathname]);

  if (isLoading) {
    return (
      <Container
        className="d-flex justify-content-center align-items-center"
        style={{ height: '80vh' }}
      >
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  // If authenticated, render the child routes
  return isAuthenticated ? <Outlet /> : null;
};

export default ProtectedRoute;
