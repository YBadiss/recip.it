import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Badge, Breadcrumb, Card, Col, ListGroup, Row } from 'react-bootstrap'
import { toast } from 'react-toastify'
import { z } from 'zod'
import {
  addToCollection,
  removeFromCollection,
} from '#/functions/recipes.functions'
import { useCurrentUser } from '#/lib/auth'
import { errorMessage, recipeQuery } from '#/lib/queries'
import { isFileLink } from '#/lib/recipe'
import type { Ingredient, Material, RecipeWithOwnership } from '#/lib/recipe'

export const Route = createFileRoute('/recipes/$id')({
  validateSearch: z.object({ action: z.literal('toggle-list').optional() }),
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(recipeQuery(params.id)),
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.title} - Recip.it` : 'Recip.it' },
    ],
  }),
  component: RecipeDetailPage,
})

function formatAmount(item: Ingredient): string {
  return item.quantity
    ? `${item.quantity}${item.unit ? ` ${item.unit}` : ''}`
    : ''
}

function hostname(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, '')
  } catch {
    return link
  }
}

function InfoCard({
  icon,
  label,
  children,
}: {
  icon: string
  label: string
  children: React.ReactNode
}) {
  return (
    <Card className="h-100">
      <Card.Body className="d-flex align-items-center">
        <i className={`bi ${icon} fs-3 me-3 text-success`}></i>
        <div className="w-100 text-truncate">
          <div className="text-muted small">{label}</div>
          <div className="fw-bold text-truncate">{children}</div>
        </div>
      </Card.Body>
    </Card>
  )
}

function useToggleCollection(recipe: RecipeWithOwnership) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      recipe.inUserList
        ? removeFromCollection({ data: { id: recipe.id } })
        : addToCollection({ data: { id: recipe.id } }),
    onSuccess: async () => {
      toast.success(
        recipe.inUserList ? 'Removed from your list' : 'Added to your list',
      )
      await queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
    onError: (error) =>
      toast.error(
        errorMessage(error, 'Failed to update your list. Please try again.'),
      ),
  })
}

function RecipeDetailPage() {
  const { id } = Route.useParams()
  const { action } = Route.useSearch()
  const navigate = useNavigate()
  const user = useCurrentUser()
  const { data: recipe } = useSuspenseQuery(recipeQuery(id))
  const toggle = useToggleCollection(recipe)

  // Finish a "star" click made before logging in.
  useEffect(() => {
    if (action !== 'toggle-list' || !user) return
    void navigate({ to: '.', search: {}, replace: true })
    if (!recipe.inUserList) toggle.mutate()
  }, [action, user])

  const handleStar = () => {
    if (!user) {
      void navigate({
        to: '/login',
        search: { redirect: `/recipes/${id}?action=toggle-list` },
      })
      return
    }
    toggle.mutate()
  }

  const ingredientsById = new Map<string, Ingredient>(
    recipe.ingredients.map((i) => [i.id, i]),
  )
  const materialsById = new Map<string, Material>(
    recipe.materials.map((m) => [m.id, m]),
  )

  return (
    <div>
      <Breadcrumb className="mb-3">
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/' }}>
          Recipes
        </Breadcrumb.Item>
        <Breadcrumb.Item active>{recipe.title}</Breadcrumb.Item>
      </Breadcrumb>

      <div className="d-flex justify-content-between align-items-start mb-2">
        <h1>{recipe.title}</h1>
        <button
          type="button"
          className="btn btn-link p-0 border-0"
          onClick={handleStar}
          disabled={toggle.isPending}
          aria-label={
            recipe.inUserList ? 'Remove from your list' : 'Add to your list'
          }
        >
          <i
            className={`bi ${recipe.inUserList ? 'bi-star-fill' : 'bi-star'} favorite-star`}
          ></i>
        </button>
      </div>

      {recipe.tags.length > 0 && (
        <div className="mb-4">
          {recipe.tags.map((tag) => (
            <Badge key={tag} className="me-1 mb-1" bg="success" pill>
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <Row className="recipe-info mb-4 g-3">
        <Col md={4}>
          <InfoCard icon="bi-clock" label="Cooking Time">
            {recipe.cookingTime || 'Not specified'}
          </InfoCard>
        </Col>
        <Col md={4}>
          <InfoCard icon="bi-people" label="Servings">
            {recipe.servings ? `${recipe.servings} servings` : 'Not specified'}
          </InfoCard>
        </Col>
        <Col md={4}>
          <InfoCard
            icon={isFileLink(recipe.link) ? 'bi-file-earmark' : 'bi-link-45deg'}
            label="Original Recipe"
          >
            {isFileLink(recipe.link) ? (
              'Uploaded file'
            ) : (
              <a
                href={recipe.link}
                target="_blank"
                rel="noopener noreferrer"
                title={recipe.link}
              >
                {hostname(recipe.link)}
              </a>
            )}
          </InfoCard>
        </Col>
      </Row>

      <div className="mb-4 recipe-detail-image-container">
        <img
          src={recipe.imageUrl || '/images/recipe-placeholder-large.png'}
          alt={recipe.title}
          className="recipe-detail-image"
          style={
            recipe.imageUrl ? undefined : { objectPosition: 'center center' }
          }
        />
      </div>

      <Row className="mb-4 g-3">
        <Col md={6}>
          <Card className="h-100">
            <Card.Header className="ingredients-header">
              Ingredients
            </Card.Header>
            <ListGroup variant="flush">
              {recipe.ingredients.length > 0 ? (
                recipe.ingredients.map((ingredient) => (
                  <ListGroup.Item
                    key={ingredient.id}
                    className="ingredient-item"
                  >
                    <strong>{ingredient.name}</strong>
                    {ingredient.quantity && (
                      <span className="ms-2">{formatAmount(ingredient)}</span>
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
            <Card.Header className="materials-header">Materials</Card.Header>
            <ListGroup variant="flush">
              {recipe.materials.length > 0 ? (
                recipe.materials.map((material) => (
                  <ListGroup.Item key={material.id} className="material-item">
                    <strong>{material.name}</strong>
                    {material.description && (
                      <p className="mb-0 small text-muted">
                        {material.description}
                      </p>
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
        <Card.Header className="instructions-header">Instructions</Card.Header>
        <Card.Body>
          {recipe.steps.length > 0 ? (
            recipe.steps.map((step, index) => (
              <div key={index} className="step-item">
                <p>
                  {index + 1}. {step.action}
                </p>
                {step.ingredients.length > 0 && (
                  <div className="mb-2">
                    {step.ingredients.map((ingredientId) => {
                      const ingredient = ingredientsById.get(ingredientId)
                      return ingredient ? (
                        <Badge
                          key={ingredientId}
                          className="me-1 mb-1 badge-ingredient"
                          bg="none"
                          pill
                        >
                          {ingredient.name}
                          {ingredient.quantity
                            ? ` - ${formatAmount(ingredient)}`
                            : ''}
                        </Badge>
                      ) : null
                    })}
                  </div>
                )}
                {step.materials.length > 0 && (
                  <div>
                    {step.materials.map((materialId) => {
                      const material = materialsById.get(materialId)
                      return material ? (
                        <Badge
                          key={materialId}
                          className="me-1 mb-1 badge-material"
                          bg="none"
                          pill
                        >
                          {material.name}
                          {material.description
                            ? ` - ${material.description}`
                            : ''}
                        </Badge>
                      ) : null
                    })}
                  </div>
                )}
              </div>
            ))
          ) : (
            <p>No instructions available</p>
          )}
        </Card.Body>
      </Card>
    </div>
  )
}
