import React from 'react';
import { Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import './RecipeCard.css';

interface ImportRecipeCardProps {
  popIntensity?: 'subtle' | 'medium' | 'intense';
}

// Pop effect intensity presets - same as RecipeCard
const popEffects = {
  subtle: {
    card: {
      transform: 'translateY(-2px) scale(1.01)',
      boxShadow: '0 0.25rem 0.5rem rgba(0, 0, 0, 0.1)',
      backgroundColor: '#fafafa',
      borderColor: '#28a74580',
      borderWidth: '1px',
    },
    image: {
      transform: 'scale(1.02)',
    },
  },
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
    },
  },
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
    },
  },
};

// Base styles
const cardStyle = {
  transition:
    'transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease, border 0.2s ease',
  cursor: 'pointer',
  backgroundColor: '#ffffff',
  borderColor: 'rgba(0, 0, 0, 0.125)',
  borderStyle: 'dashed',
  height: '100%',
};

const ImportRecipeCard: React.FC<ImportRecipeCardProps> = ({ popIntensity = 'medium' }) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = React.useState(false);

  // Get the appropriate pop effect based on intensity
  const popEffect = popEffects[popIntensity];

  const handleCardClick = () => {
    navigate('/import');
  };

  return (
    <Card
      className="recipe-card h-100 shadow-sm clickable-card"
      onClick={handleCardClick}
      style={{
        ...cardStyle,
        ...(isHovered ? popEffect.card : {}),
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="recipe-image-container">
        <img
          src="/images/recipe-placeholder.png"
          className="recipe-image"
          alt="Recipe placeholder"
          style={{
            ...(isHovered ? popEffect.image : {}),
            objectPosition: 'center bottom',
            opacity: '0.5',
          }}
        />
        <div
          className="position-absolute d-flex justify-content-center align-items-center"
          style={{
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1,
          }}
        >
          <div
            className="rounded-circle d-flex justify-content-center align-items-center"
            style={{
              width: '60px',
              height: '60px',
              backgroundColor: 'var(--secondary-color)',
              color: 'white',
            }}
          >
            <i className="bi bi-plus-lg" style={{ fontSize: '1.75rem' }}></i>
          </div>
        </div>
      </div>
      <Card.Body className="text-center">
        <Card.Title>Import Recipe</Card.Title>
        <p className="text-muted small">Add a recipe from your favorite website</p>
      </Card.Body>
    </Card>
  );
};

export default ImportRecipeCard;
