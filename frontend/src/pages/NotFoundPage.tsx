import React from 'react';
import { Container, Card, Button, Image } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  return (
    <Container className="py-5 text-center">
      <Card className="border-0 shadow-sm p-4">
        <Card.Body>
          <Image 
            src="/images/404.png" 
            alt="Page not found" 
            className="img-fluid mb-4"
            style={{ maxHeight: '300px' }}
          />
          <h2 className="mb-3 text-primary">Oops! It seems you've wandered off the path</h2>
          <p className="text-muted mb-4">
            Don't worry, we all get lost sometimes. The recipe you're looking for might be taking a break.
          </p>
          <Link to="/">
            <Button variant="success">Return to Your Recipes</Button>
          </Link>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default NotFoundPage;
