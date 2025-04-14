import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert, Breadcrumb } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { recipeApi } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const AddRecipePage: React.FC = () => {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  const validateUrl = (value: string): boolean => {
    if (!value) {
      setUrlError('Please enter a URL');
      return false;
    }

    try {
      new URL(value);
      setUrlError(null);
      return true;
    } catch {
      setUrlError('Please enter a valid URL');
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateUrl(url)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const recipe = await recipeApi.import({ link: url });

      if (recipe && recipe.id) {
        navigate(`/recipes/${recipe.id}`);
      } else {
        setError('Failed to process recipe. Please try a different URL.');
      }
    } catch (err) {
      console.error('Error adding recipe:', err);
      setError('Failed to add recipe. The URL may not contain a valid recipe.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Adding recipe from URL... This may take a moment." />;
  }

  return (
    <Container className="py-4">
      {/* Breadcrumb navigation */}
      <Breadcrumb className="mb-3">
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/' }}>
          Recipes
        </Breadcrumb.Item>
        <Breadcrumb.Item active>Add Recipe</Breadcrumb.Item>
      </Breadcrumb>

      <h1 className="mb-4">Add New Recipe</h1>

      <Card>
        <Card.Body>
          <Card.Text>
            Enter the URL of a recipe you&apos;d like to add. We&apos;ll extract the ingredients,
            steps, and other details automatically.
          </Card.Text>
          <Card.Text>Make sure the URL links directly to the recipe page.</Card.Text>

          {error && <Alert variant="danger">{error}</Alert>}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Control
                type="text"
                placeholder="https://example.com/recipe"
                value={url}
                onChange={e => setUrl(e.target.value)}
                isInvalid={!!urlError}
              />
              {urlError && <Form.Control.Feedback type="invalid">{urlError}</Form.Control.Feedback>}
            </Form.Group>

            <div className="d-grid">
              <Button variant="outline-primary" type="submit">
                Add Recipe
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default AddRecipePage;
