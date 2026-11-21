import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Alert, Button, Col, Row } from 'react-bootstrap'
import { z } from 'zod'
import { AddRecipeCard, RecipeCard } from '#/components/RecipeCard'
import { useCurrentUser } from '#/lib/auth'
import { recipesQuery } from '#/lib/queries'
import { filterRecipes } from '#/lib/search'
import type { RecipeWithOwnership } from '#/lib/recipe'

const PER_PAGE = 6

export const Route = createFileRoute('/')({
  validateSearch: z.object({ q: z.string().optional() }),
  loader: ({ context }) => context.queryClient.ensureQueryData(recipesQuery),
  component: HomePage,
})

function RecipeCarousel({
  title,
  recipes,
  variant,
  showAddCard,
}: {
  title: React.ReactNode
  recipes: RecipeWithOwnership[]
  variant: 'subtle' | 'medium'
  showAddCard: boolean
}) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(recipes.length / PER_PAGE))
  const current = Math.min(page, totalPages)
  const items = recipes.slice((current - 1) * PER_PAGE, current * PER_PAGE)

  useEffect(() => setPage(1), [recipes.length])

  return (
    <section className="mb-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">{title}</h2>
        <span className="text-muted">
          Page {current} of {totalPages}
        </span>
      </div>
      <div className="carousel-container position-relative">
        {current > 1 && (
          <>
            <div
              className="carousel-click-area carousel-click-area-left"
              onClick={() => setPage(current - 1)}
            ></div>
            <Button
              variant="light"
              className="carousel-nav-btn carousel-nav-btn-left"
              aria-label="Previous page"
              onClick={() => setPage(current - 1)}
            >
              <i className="bi bi-chevron-left"></i>
            </Button>
          </>
        )}
        <Row xs={1} md={2} lg={3} className="g-4">
          {items.map((recipe) => (
            <Col key={recipe.id}>
              <RecipeCard recipe={recipe} variant={variant} />
            </Col>
          ))}
          {showAddCard && current === totalPages && items.length < PER_PAGE && (
            <Col>
              <AddRecipeCard variant={variant} />
            </Col>
          )}
        </Row>
        {current < totalPages && (
          <>
            <div
              className="carousel-click-area carousel-click-area-right"
              onClick={() => setPage(current + 1)}
            ></div>
            <Button
              variant="light"
              className="carousel-nav-btn carousel-nav-btn-right"
              aria-label="Next page"
              onClick={() => setPage(current + 1)}
            >
              <i className="bi bi-chevron-right"></i>
            </Button>
          </>
        )}
      </div>
    </section>
  )
}

function HomePage() {
  const { q = '' } = Route.useSearch()
  const user = useCurrentUser()
  const { data: recipes } = useSuspenseQuery(recipesQuery)

  const matching = filterRecipes(recipes, q)
  const mine = user ? matching.filter((r) => r.inUserList) : []
  const community = user ? matching.filter((r) => !r.inUserList) : matching

  return (
    <div>
      {q && matching.length === 0 && (
        <Alert variant="info">{`No recipes found matching "${q}". Try a different search term.`}</Alert>
      )}

      {user && (
        <RecipeCarousel
          title={
            <>
              <i className="bi bi-star-fill text-warning me-2"></i>My Recipes
            </>
          }
          recipes={mine}
          variant="medium"
          showAddCard
        />
      )}

      {community.length > 0 && (
        <RecipeCarousel
          title={
            <>
              <i className="bi bi-globe text-primary me-2"></i>Community Recipes
            </>
          }
          recipes={community}
          variant="subtle"
          showAddCard={!user}
        />
      )}

      {!user && community.length === 0 && !q && (
        <Row xs={1} md={2} lg={3} className="g-4">
          <Col>
            <AddRecipeCard variant="subtle" />
          </Col>
        </Row>
      )}
    </div>
  )
}
