import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Row,
  Col,
  Card,
  Badge,
  Button,
  ListGroup,
  Alert,
  OverlayTrigger,
  Tooltip,
} from 'react-bootstrap';
import { Recipe, Ingredient, Material } from '../types/recipe';
import { recipeApi } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const RecipeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reimporting, setReimporting] = useState(false);

  useEffect(() => {
    const fetchRecipe = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);
        const data = await recipeApi.getById(id);
        setRecipe(data);
      } catch (err) {
        console.error('Error fetching recipe:', err);
        setError('Failed to load recipe. It may have been deleted or is unavailable.');
      } finally {
        setLoading(false);
      }
    };

    fetchRecipe();
  }, [id]);

  const handleDelete = async () => {
    if (!id || !recipe) return;

    if (window.confirm(`Are you sure you want to delete "${recipe.title}"?`)) {
      try {
        await recipeApi.delete(id);
        navigate('/');
      } catch (err) {
        console.error('Error deleting recipe:', err);
        setError('Failed to delete recipe. Please try again.');
      }
    }
  };

  const handleReimport = async () => {
    if (!id) return;

    try {
      setReimporting(true);
      setError(null);
      const updatedRecipe = await recipeApi.reimport(id);
      setRecipe(updatedRecipe);
      setReimporting(false);
    } catch (err) {
      console.error('Error reimporting recipe:', err);
      setError('Failed to reimport recipe. Please try again.');
      setReimporting(false);
    }
  };

  const getIngredientById = (ingredientId: string): Ingredient | undefined => {
    return recipe?.ingredients?.find(ing => ing.id === ingredientId);
  };

  const getMaterialById = (materialId: string): Material | undefined => {
    return recipe?.materials?.find(mat => mat.id === materialId);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (reimporting) {
    return <LoadingSpinner message="Reimporting recipe from original source..." />;
  }

  if (error || !recipe) {
    return (
      <Alert variant="danger">
        {error || 'Recipe not found'}
        <div className="mt-3">
          <Link to="/" className="btn btn-primary">
            Back to Recipes
          </Link>
        </div>
      </Alert>
    );
  }

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-start mb-4">
        <h1>{recipe.title}</h1>
        <div>
          <Button variant="outline-primary" className="me-2" onClick={handleReimport}>
            Reimport
          </Button>
          <Button variant="outline-danger" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>

      {recipe.link && (
        <Card className="mb-4">
          <Card.Body>
            <Card.Title>Original Recipe</Card.Title>
            <Card.Text>
              <a href={recipe.link} target="_blank" rel="noopener noreferrer">
                {recipe.link}
              </a>
            </Card.Text>
          </Card.Body>
        </Card>
      )}

      <Row className="mb-4">
        <Col md={6}>
          <Card className="h-100">
            <Card.Header className="bg-success text-white">Ingredients</Card.Header>
            <ListGroup variant="flush">
              {recipe.ingredients && recipe.ingredients.length > 0 ? (
                recipe.ingredients.map(ingredient => (
                  <ListGroup.Item key={ingredient.id} className="ingredient-item">
                    <strong>{ingredient.name}</strong>
                    {ingredient.quantity && ingredient.unit && (
                      <span className="ms-2">
                        {ingredient.quantity} {ingredient.unit}
                      </span>
                    )}
                  </ListGroup.Item>
                ))
              ) : (
                <ListGroup.Item>No ingredients listed</ListGroup.Item>
              )}
            </ListGroup>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="h-100">
            <Card.Header className="bg-warning text-dark">Materials</Card.Header>
            <ListGroup variant="flush">
              {recipe.materials && recipe.materials.length > 0 ? (
                recipe.materials.map(material => (
                  <ListGroup.Item key={material.id} className="material-item">
                    <strong>{material.name}</strong>
                    {material.description && (
                      <p className="mb-0 small text-muted">{material.description}</p>
                    )}
                  </ListGroup.Item>
                ))
              ) : (
                <ListGroup.Item>No materials listed</ListGroup.Item>
              )}
            </ListGroup>
          </Card>
        </Col>
      </Row>

      <Card>
        <Card.Header className="bg-success text-white">Instructions</Card.Header>
        <Card.Body>
          {recipe.steps && recipe.steps.length > 0 ? (
            recipe.steps.map((step, index) => (
              <div key={index} className="step-item">
                <h5>Step {index + 1}</h5>
                <p>{step.action}</p>

                {step.ingredients && step.ingredients.length > 0 && (
                  <div className="mb-2">
                    <strong>Ingredients for this step:</strong>
                    <div>
                      {step.ingredients.map(ingredientId => {
                        const ingredient = getIngredientById(ingredientId);
                        return ingredient ? (
                          <OverlayTrigger
                            key={ingredientId}
                            placement="top"
                            overlay={
                              <Tooltip>
                                {ingredient.quantity && ingredient.unit
                                  ? `${ingredient.quantity} ${ingredient.unit}`
                                  : 'No quantity specified'}
                              </Tooltip>
                            }
                          >
                            <Badge className="me-1 mb-1 badge-ingredient" pill>
                              {ingredient.name}
                            </Badge>
                          </OverlayTrigger>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                {step.materials && step.materials.length > 0 && (
                  <div>
                    <strong>Materials needed:</strong>
                    <div>
                      {step.materials.map(materialId => {
                        const material = getMaterialById(materialId);
                        return material ? (
                          <OverlayTrigger
                            key={materialId}
                            placement="top"
                            overlay={<Tooltip>{material.description || 'No description'}</Tooltip>}
                          >
                            <Badge className="me-1 mb-1 badge-material" pill>
                              {material.name}
                            </Badge>
                          </OverlayTrigger>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p>No instructions available</p>
          )}
        </Card.Body>
      </Card>

      {recipe.tags && recipe.tags.length > 0 && (
        <div className="mt-4">
          <h5>Tags</h5>
          {recipe.tags.map((tag, index) => (
            <Badge key={index} className="me-1 mb-1" bg="success">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <div className="mt-4">
        <Link to="/" className="btn btn-outline-primary">
          Back to All Recipes
        </Link>
      </div>
    </Container>
  );
};

export default RecipeDetailPage;
