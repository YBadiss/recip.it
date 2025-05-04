import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Row, Col, Alert, Button } from 'react-bootstrap';
import { Recipe } from '@recipit/core';
import { useAuth } from '../context/AuthContext';
import RecipeCard from '../components/RecipeCard';
import AddRecipeCard from '../components/AddRecipeCard';
import { recipeService } from '../services';

// Define custom event type
interface RecipeSearchEvent extends CustomEvent {
  detail: {
    query: string;
  };
}

const HomePage: React.FC = () => {
  // Displayed recipes
  const [userRecipes, setUserRecipes] = useState<Recipe[]>([]);
  const [communityRecipes, setCommunityRecipes] = useState<Recipe[]>([]);

  // Pagination state
  const [userRecipesTotal, setUserRecipesTotal] = useState(0);
  const [userRecipesPage, setUserRecipesPage] = useState(1);
  const [communityRecipesPage, setCommunityRecipesPage] = useState(1);
  const [userRecipesTotalPages, setUserRecipesTotalPages] = useState(1);
  const [communityRecipesTotalPages, setCommunityRecipesTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { isAuthenticated } = useAuth();

  // Use a ref to track the current search query
  const currentQueryRef = useRef<string>('');

  const numberOfRecipesPerRowXs = 1;
  const numberOfRecipesPerRowMd = 2;
  const numberOfRecipesPerRowLg = 3;
  const itemsPerPage = numberOfRecipesPerRowLg * 2;

  // Load recipes using the service
  const loadRecipes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Use the current search query state instead of URL
      const queryToUse = currentQueryRef.current;

      // Use the service to get filtered and paginated recipes
      const { userRecipes: userRecipesData, communityRecipes: communityRecipesData } =
        await recipeService.getFilteredRecipes(
          queryToUse,
          isAuthenticated || false,
          userRecipesPage,
          communityRecipesPage,
          itemsPerPage
        );

      // Update state with the filtered/paginated recipes
      setUserRecipes(userRecipesData.items);
      setCommunityRecipes(communityRecipesData.items);
      setUserRecipesTotal(userRecipesData.total);
      setUserRecipesTotalPages(userRecipesData.totalPages);
      setCommunityRecipesTotalPages(communityRecipesData.totalPages);
      setUserRecipesPage(userRecipesData.page);
      setCommunityRecipesPage(communityRecipesData.page);

      setLoading(false);
    } catch (err) {
      console.error('Error loading recipes:', err);
      setError('Failed to load recipes. Please try again later.');
      setLoading(false);
    }
  }, [isAuthenticated, userRecipesPage, communityRecipesPage, itemsPerPage]);

  // Listen for search events from the header
  useEffect(() => {
    const handleSearch = (event: RecipeSearchEvent) => {
      const newQuery = event.detail.query;

      if (newQuery !== currentQueryRef.current) {
        currentQueryRef.current = newQuery;
        setSearchQuery(newQuery);

        // Reset pagination when search changes
        setUserRecipesPage(1);
        setCommunityRecipesPage(1);

        // Load recipes with new query
        loadRecipes();
      }
    };

    window.addEventListener('recipe-search', handleSearch as EventListener);

    return () => {
      window.removeEventListener('recipe-search', handleSearch as EventListener);
    };
  }, [loadRecipes]);

  // Initial load effect - runs on mount and auth change
  useEffect(() => {
    // Avoid running fetch if auth status is not yet determined
    if (typeof isAuthenticated === 'undefined') {
      return;
    }

    // Reset pagination when auth changes
    setUserRecipesPage(1);
    setCommunityRecipesPage(1);

    loadRecipes();
  }, [isAuthenticated, loadRecipes]);

  // Handle navigation for user recipes
  const handleUserRecipesNavigation = (direction: 'prev' | 'next') => {
    const newPage = direction === 'next' ? userRecipesPage + 1 : userRecipesPage - 1;

    if (newPage >= 1 && newPage <= userRecipesTotalPages) {
      setUserRecipesPage(newPage);
      loadRecipes();
    }
  };

  // Handle navigation for community recipes
  const handleCommunityRecipesNavigation = (direction: 'prev' | 'next') => {
    const newPage = direction === 'next' ? communityRecipesPage + 1 : communityRecipesPage - 1;

    if (newPage >= 1 && newPage <= communityRecipesTotalPages) {
      setCommunityRecipesPage(newPage);
      loadRecipes();
    }
  };

  if (loading) {
    return <div></div>;
  }

  const noResultsFound = isAuthenticated
    ? userRecipes.length === 0 && communityRecipes.length === 0
    : communityRecipes.length === 0;

  return (
    <div>
      {error && <Alert variant="danger">{error}</Alert>}

      <div>
        {searchQuery && noResultsFound && (
          <Alert variant="info">
            {`No recipes found matching "${searchQuery}". Try a different search term.`}
          </Alert>
        )}

        {isAuthenticated && (
          <div className="mb-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2 className="mb-0">
                <i
                  className="bi bi-star-fill text-warning me-2"
                  style={{ fontSize: '1.75rem' }}
                ></i>
                My Recipes
              </h2>
              <span className="text-muted">
                Page {userRecipesPage} of {userRecipesTotalPages}
              </span>
            </div>

            <div className="carousel-container position-relative">
              {userRecipesPage > 1 && (
                <>
                  <div
                    className="carousel-click-area carousel-click-area-left"
                    onClick={() => handleUserRecipesNavigation('prev')}
                  ></div>
                  <Button
                    variant="light"
                    className="carousel-nav-btn carousel-nav-btn-left"
                    onClick={() => handleUserRecipesNavigation('prev')}
                  >
                    <i className="bi bi-chevron-left"></i>
                  </Button>
                </>
              )}

              <Row
                xs={numberOfRecipesPerRowXs}
                md={numberOfRecipesPerRowMd}
                lg={numberOfRecipesPerRowLg}
                className="g-4"
              >
                {userRecipes.map(recipe => (
                  <Col key={recipe.id}>
                    <RecipeCard recipe={recipe} popIntensity="medium" />
                  </Col>
                ))}
                {((userRecipesPage === userRecipesTotalPages &&
                  userRecipes.length < itemsPerPage) ||
                  userRecipesTotal === 0) && (
                  <Col>
                    <AddRecipeCard popIntensity="medium" />
                  </Col>
                )}
              </Row>

              {userRecipesPage < userRecipesTotalPages && (
                <>
                  <div
                    className="carousel-click-area carousel-click-area-right"
                    onClick={() => handleUserRecipesNavigation('next')}
                  ></div>
                  <Button
                    variant="light"
                    className="carousel-nav-btn carousel-nav-btn-right"
                    onClick={() => handleUserRecipesNavigation('next')}
                  >
                    <i className="bi bi-chevron-right"></i>
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        <div className="mb-5">
          {communityRecipes.length > 0 && (
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2 className="mb-0">
                <i className="bi bi-globe text-primary me-2" style={{ fontSize: '1.75rem' }}></i>
                Community Recipes
              </h2>
              <span className="text-muted">
                Page {communityRecipesPage} of {communityRecipesTotalPages}
              </span>
            </div>
          )}

          <div className="carousel-container position-relative">
            {communityRecipesPage > 1 && (
              <>
                <div
                  className="carousel-click-area carousel-click-area-left"
                  onClick={() => handleCommunityRecipesNavigation('prev')}
                ></div>
                <Button
                  variant="light"
                  className="carousel-nav-btn carousel-nav-btn-left"
                  onClick={() => handleCommunityRecipesNavigation('prev')}
                >
                  <i className="bi bi-chevron-left"></i>
                </Button>
              </>
            )}

            <Row
              xs={numberOfRecipesPerRowXs}
              md={numberOfRecipesPerRowMd}
              lg={numberOfRecipesPerRowLg}
              className="g-4"
            >
              {communityRecipes.map(recipe => (
                <Col key={recipe.id}>
                  <RecipeCard recipe={recipe} popIntensity="subtle" />
                </Col>
              ))}
              {!isAuthenticated &&
                ((communityRecipesPage === communityRecipesTotalPages &&
                  communityRecipes.length < itemsPerPage) ||
                  communityRecipes.length === 0) && (
                  <Col>
                    <AddRecipeCard popIntensity="subtle" />
                  </Col>
                )}
            </Row>

            {communityRecipesPage < communityRecipesTotalPages && (
              <>
                <div
                  className="carousel-click-area carousel-click-area-right"
                  onClick={() => handleCommunityRecipesNavigation('next')}
                ></div>
                <Button
                  variant="light"
                  className="carousel-nav-btn carousel-nav-btn-right"
                  onClick={() => handleCommunityRecipesNavigation('next')}
                >
                  <i className="bi bi-chevron-right"></i>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
