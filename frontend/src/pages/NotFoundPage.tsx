import React from 'react';
import { Container, Card, Button, Image } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  // Function to go back to previous page
  const handleGoBack = () => {
    // This will go back in the history stack, preserving auth state
    navigate(-1);
  };

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
          <h2 className="mb-3 text-primary">Oops! It seems you&apos;ve wandered off the path</h2>
          <p className="text-muted mb-4">
            Don&apos;t worry, we all get lost sometimes. The recipe you&apos;re looking for might be
            taking a break.
          </p>
          <div className="d-flex justify-content-center gap-3">
            <Link to="/">
              <Button variant="success">Return to Your Recipes</Button>
            </Link>
            <Button variant="outline-secondary" onClick={handleGoBack}>
              Go Back
            </Button>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default NotFoundPage;
