import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { recipeApi } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const ImportRecipePage: React.FC = () => {
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
      console.error('Error importing recipe:', err);
      setError('Failed to import recipe. The URL may not contain a valid recipe.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Importing recipe from URL... This may take a moment." />;
  }

  return (
    <Container className="py-4">
      <h1 className="mb-4">Import Recipe</h1>

      <Card>
        <Card.Body>
          <Card.Title>Import from URL</Card.Title>
          <Card.Text>
            Enter the URL of a recipe you&apos;d like to import. We&apos;ll extract the ingredients, steps,
            and other details automatically.
          </Card.Text>

          {error && <Alert variant="danger">{error}</Alert>}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Recipe URL</Form.Label>
              <Form.Control
                type="text"
                placeholder="https://example.com/recipe"
                value={url}
                onChange={e => setUrl(e.target.value)}
                isInvalid={!!urlError}
              />
              {urlError && <Form.Control.Feedback type="invalid">{urlError}</Form.Control.Feedback>}
              <Form.Text className="text-muted">
                Make sure the URL links directly to the recipe page.
              </Form.Text>
            </Form.Group>

            <div className="d-grid gap-2">
              <Button variant="success" type="submit">
                Import Recipe
              </Button>
              <Button variant="outline-secondary" onClick={() => navigate('/')}>
                Cancel
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ImportRecipePage;
