import { Link } from '@tanstack/react-router'
import { Badge, Card } from 'react-bootstrap'
import type { Recipe } from '#/lib/recipe'

type Variant = 'subtle' | 'medium'

export function RecipeCard({
  recipe,
  variant = 'medium',
}: {
  recipe: Recipe
  variant?: Variant
}) {
  return (
    <Link
      to="/recipes/$id"
      params={{ id: recipe.id }}
      className="text-reset text-decoration-none d-block h-100"
    >
      <Card
        className={`recipe-card recipe-card-${variant} h-100 shadow-sm clickable-card`}
      >
        <div className="recipe-image-container">
          <img
            src={recipe.imageUrl || '/images/recipe-placeholder.png'}
            className="recipe-image"
            alt={recipe.title}
            loading="lazy"
            style={
              recipe.imageUrl ? undefined : { objectPosition: 'center bottom' }
            }
          />
        </div>
        <Card.Body>
          <Card.Title>{recipe.title}</Card.Title>
          <div className="d-flex align-items-center text-muted small mb-3">
            <i className="bi bi-clock me-1"></i>
            <span>{recipe.cookingTime || 'N/A'}</span>
            <span className="mx-2">•</span>
            <i className="bi bi-people me-1"></i>
            <span>{recipe.servings ? `${recipe.servings} servings` : '-'}</span>
          </div>
          <div>
            {recipe.tags.map((tag) => (
              <Badge key={tag} className="me-1 mb-1" bg="success" pill>
                {tag}
              </Badge>
            ))}
          </div>
        </Card.Body>
      </Card>
    </Link>
  )
}

export function AddRecipeCard({ variant = 'medium' }: { variant?: Variant }) {
  return (
    <Link to="/add" className="text-reset text-decoration-none d-block h-100">
      <Card
        className={`recipe-card recipe-card-${variant} add-recipe-card h-100 shadow-sm clickable-card`}
      >
        <div className="recipe-image-container">
          <img
            src="/images/recipe-placeholder.png"
            className="recipe-image"
            alt=""
            style={{ objectPosition: 'center bottom', opacity: 0.5 }}
          />
          <div className="position-absolute top-0 start-0 end-0 bottom-0 d-flex justify-content-center align-items-center">
            <div className="add-recipe-icon rounded-circle d-flex justify-content-center align-items-center">
              <i className="bi bi-plus-lg"></i>
            </div>
          </div>
        </div>
        <Card.Body className="text-center">
          <Card.Title>Add Recipe</Card.Title>
          <p className="text-muted small">
            Add a new recipe from a website, a video or a photo
          </p>
        </Card.Body>
      </Card>
    </Link>
  )
}
