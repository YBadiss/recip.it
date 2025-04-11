import React from 'react';
import { Container, Alert, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  return (
    <Container className="py-5 text-center">
      <Alert variant="danger">
        <Alert.Heading>404 - Page Not Found</Alert.Heading>
        <p>The page you are looking for does not exist or has been moved.</p>
      </Alert>
      <Link to="/">
        <Button variant="success">Return to Home</Button>
      </Link>
    </Container>
  );
};

export default NotFoundPage;
