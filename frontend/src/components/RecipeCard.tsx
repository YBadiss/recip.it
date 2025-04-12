import React from 'react';
import { Card, Badge, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { Recipe } from '../types/recipe';
import './RecipeCard.css';

interface RecipeCardProps {
  recipe: Recipe;
  popIntensity?: 'subtle' | 'medium' | 'intense';
}

// Pop effect intensity presets
const popEffects = {
  // Subtle effect (less pop)
  subtle: {
    card: {
      transform: 'translateY(-2px) scale(1.01)',
      boxShadow: '0 0.25rem 0.5rem rgba(0, 0, 0, 0.1)',
      backgroundColor: '#fafafa',
      borderColor: '#28a74580', // Semi-transparent success color
      borderWidth: '1px',
    },
    image: {
      transform: 'scale(1.02)',
    }
  },
  // Default effect (medium pop)
  medium: {
    card: {
      transform: 'translateY(-5px) scale(1.02)',
      boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)',
      backgroundColor: '#f8fff9',
      borderColor: '#28a745',
      borderWidth: '1px',
    },
    image: {
      transform: 'scale(1.05)',
    }
  },
  // Intense effect (more pop)
  intense: {
    card: {
      transform: 'translateY(-8px) scale(1.04)',
      boxShadow: '0 1rem 2rem rgba(0, 0, 0, 0.2)',
      backgroundColor: '#f0fff2',
      borderColor: '#28a745',
      borderWidth: '2px',
    },
    image: {
      transform: 'scale(1.1)',
    }
  }
};

// Base styles
const cardStyle = {
  transition: 'transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease, border 0.2s ease',
  cursor: 'pointer',
  backgroundColor: '#ffffff',
  borderColor: 'rgba(0, 0, 0, 0.125)',
};

const RecipeCard: React.FC<RecipeCardProps> = ({ 
  recipe,
  popIntensity = 'medium'
}) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = React.useState(false);
  
  // Get the appropriate pop effect based on intensity
  const popEffect = popEffects[popIntensity];
  
  // Function to get a default image if recipe doesn't have one
  const getRecipeImage = () => {
    return recipe.imageUrl || '/images/recipe-placeholder.png';
  };

  // Determine if we're using a placeholder image
  const isPlaceholder = !recipe.imageUrl;

  const handleCardClick = () => {
    navigate(`/recipes/${recipe.id}`);
  };

  return (
    <Card 
      className="recipe-card h-100 shadow-sm clickable-card" 
      onClick={handleCardClick}
      style={{
        ...cardStyle,
        ...(isHovered ? popEffect.card : {})
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="recipe-image-container">
        <img 
          src={getRecipeImage()} 
          className="recipe-image" 
          alt={recipe.title}
          style={{
            ...(isHovered ? popEffect.image : {}),
            ...(isPlaceholder ? { objectPosition: 'center bottom' } : {})
          }}
        />
      </div>
      <Card.Body>
        <Card.Title>{recipe.title}</Card.Title>

        <Row className="mb-3">
          <Col>
            <div className="d-flex align-items-center text-muted small">
              <i className="bi bi-clock me-1"></i>
              <span>{recipe.cookingTime || recipe.cookTime || 'N/A'}</span>

              <span className="mx-2">•</span>

              <i className="bi bi-people me-1"></i>
              <span>{recipe.servings ? `${recipe.servings} servings` : '-'}</span>

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
    </Card>
  );
};

export default RecipeCard;
