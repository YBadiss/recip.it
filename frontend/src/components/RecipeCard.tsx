import React from 'react';
import { Card, Badge, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { Recipe } from '../types/recipe';

interface RecipeCardProps {
  recipe: Recipe;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe }) => {
  // Function to get a default image if recipe doesn't have one
  const getRecipeImage = () => {
    return recipe.image || 'https://via.placeholder.com/300x200?text=No+Image';
  };

  return (
    <Card className="recipe-card h-100 shadow-sm">
      <div className="recipe-image-container">
        <img src={getRecipeImage()} className="card-img-top recipe-image" alt={recipe.title} />
      </div>
      <Card.Body>
        <Card.Title>{recipe.title}</Card.Title>

        <Row className="mb-3">
          <Col>
            <div className="d-flex align-items-center text-muted small">
              <i className="bi bi-clock me-1"></i>
              <span>{recipe.cookTime || 'N/A'}</span>

              <span className="mx-2">•</span>

              <i className="bi bi-ui-checks me-1"></i>
              <span>{recipe.steps?.length || 0} steps</span>
            </div>
          </Col>
        </Row>

        <div className="mb-3">
          {recipe.tags &&
            recipe.tags.map((tag, index) => (
              <Badge key={index} className="me-1 mb-1" bg="success" pill>
                {tag}
              </Badge>
            ))}
        </div>
      </Card.Body>
      <Card.Footer className="bg-white border-top-0">
        <Link to={`/recipes/${recipe.id}`} className="btn btn-outline-primary btn-sm w-100">
          View Recipe
        </Link>
      </Card.Footer>
    </Card>
  );
};

export default RecipeCard;
