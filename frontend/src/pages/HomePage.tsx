import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Row, Col, Alert, Button } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';
import { Recipe } from '../types/recipe';
import { recipeApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import RecipeCard from '../components/RecipeCard';
import AddRecipeCard from '../components/AddRecipeCard';

const HomePage: React.FC = () => {
  const [userRecipes, setUserRecipes] = useState<Recipe[]>([]);
  const [communityRecipes, setCommunityRecipes] = useState<Recipe[]>([]);
  const [userRecipesTotal, setUserRecipesTotal] = useState(0);
  const [userRecipesPage, setUserRecipesPage] = useState(1);
  const [communityRecipesPage, setCommunityRecipesPage] = useState(1);
  const [userRecipesTotalPages, setUserRecipesTotalPages] = useState(1);
  const [communityRecipesTotalPages, setCommunityRecipesTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();

  // Use a ref to track the current search query *being fetched* to avoid duplicates
  const currentFetchQueryRef = useRef<string | undefined>(undefined);

  const numberOfRecipesPerRowXs = 1;
  const numberOfRecipesPerRowMd = 2;
  const numberOfRecipesPerRowLg = 3;
  const queryLimit = numberOfRecipesPerRowLg * 2;

  // Fetch user recipes with current page - wrapped in useCallback
  const fetchUserRecipes = useCallback(
    async (page: number, query: string) => {
      if (!isAuthenticated) {
        setUserRecipes([]);
        setUserRecipesTotal(0);
        setUserRecipesTotalPages(1);
        return;
      }

      try {
        const userRecipesResponse = await recipeApi.getAll({
          limit: queryLimit,
          page,
          query: query || undefined,
          inUserList: true,
        });

        setUserRecipes(userRecipesResponse.items);
        setUserRecipesTotal(userRecipesResponse.total);
        setUserRecipesTotalPages(userRecipesResponse.totalPages);
      } catch (err) {
        setError('Failed to load your recipes. Please try again later.');
      }
    },
    [isAuthenticated, numberOfRecipesPerRowLg]
  ); // Dependency: isAuthenticated

  // Fetch community recipes with current page - wrapped in useCallback
  const fetchCommunityRecipes = useCallback(
    async (page: number, query: string) => {
      try {
        const communityRecipesResponse = await recipeApi.getAll({
          limit: queryLimit,
          page,
          query: query || undefined,
          inUserList: isAuthenticated ? false : undefined,
        });

        setCommunityRecipes(communityRecipesResponse.items);
        setCommunityRecipesTotalPages(communityRecipesResponse.totalPages);
      } catch (err) {
        console.error('Error fetching community recipes:', err);
        setError('Failed to load community recipes. Please try again later.');
      }
    },
    [isAuthenticated, numberOfRecipesPerRowLg]
  ); // Dependency: isAuthenticated

  // Primary fetch effect: Runs on mount, auth change, and URL search param change
  useEffect(() => {
    // Avoid running fetch if auth status is not yet determined
    if (typeof isAuthenticated === 'undefined') {
      console.log('Primary fetch effect: Skipping fetch, isAuthenticated is undefined');
      return;
    }

    const queryFromUrl = searchParams.get('q') || '';

    // --- Gatekeeping: Only fetch if the query has actually changed ---
    if (queryFromUrl === currentFetchQueryRef.current) {
      return;
    }
    // -----------------------------------------------------------------

    const fetchRecipesForQuery = async (query: string) => {
      currentFetchQueryRef.current = query; // Update ref *before* fetching

      try {
        setLoading(true);
        setError(null);

        // Reset pages when search query changes
        setUserRecipesPage(1);
        setCommunityRecipesPage(1);

        // Fetch both user and community recipes in parallel
        await Promise.all([fetchUserRecipes(1, query), fetchCommunityRecipes(1, query)]);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching recipes:', err);
        setError('Failed to load recipes. Please try again later.');
        setLoading(false);
      }
    };

    fetchRecipesForQuery(queryFromUrl);
  }, [searchParams, isAuthenticated, fetchUserRecipes, fetchCommunityRecipes]); // Added fetch functions to dependencies

  // Handle recipe updates from RecipeCard components
  const handleRecipeUpdate = (updatedRecipe: Recipe) => {
    if (updatedRecipe.inUserList) {
      setUserRecipes(recipes => recipes.map(r => (r.id === updatedRecipe.id ? updatedRecipe : r)));
    } else {
      setCommunityRecipes(recipes =>
        recipes.map(r => (r.id === updatedRecipe.id ? updatedRecipe : r))
      );
    }
  };

  // Handle navigation for user recipes
  const handleUserRecipesNavigation = (direction: 'prev' | 'next') => {
    const newPage = direction === 'next' ? userRecipesPage + 1 : userRecipesPage - 1;

    if (newPage >= 1 && newPage <= userRecipesTotalPages) {
      setUserRecipesPage(newPage);

      // Fetch user recipes for the new page
      const fetchUserRecipesForPage = async () => {
        try {
          const userRecipesResponse = await recipeApi.getAll({
            limit: queryLimit,
            page: newPage,
            query: currentFetchQueryRef.current || undefined,
            inUserList: true,
          });

          setUserRecipes(userRecipesResponse.items);
        } catch (err) {
          console.error('Error fetching user recipes:', err);
          setError('Failed to load your recipes. Please try again later.');
        }
      };

      fetchUserRecipesForPage();
    }
  };

  // Handle navigation for community recipes
  const handleCommunityRecipesNavigation = (direction: 'prev' | 'next') => {
    const newPage = direction === 'next' ? communityRecipesPage + 1 : communityRecipesPage - 1;

    if (newPage >= 1 && newPage <= communityRecipesTotalPages) {
      setCommunityRecipesPage(newPage);

      // Fetch community recipes for the new page
      const fetchCommunityRecipesForPage = async () => {
        try {
          const communityRecipesResponse = await recipeApi.getAll({
            limit: queryLimit,
            page: newPage,
            query: currentFetchQueryRef.current || undefined,
            inUserList: isAuthenticated ? false : undefined,
          });

          setCommunityRecipes(communityRecipesResponse.items);
        } catch (err) {
          setError('Failed to load community recipes. Please try again later.');
        }
      };

      fetchCommunityRecipesForPage();
    }
  };

  if (loading) {
    return <div></div>;
  }

  // Read the latest query from URL for display purposes
  const displayQuery = searchParams.get('q') || '';

  const noResultsFound = isAuthenticated
    ? userRecipes.length === 0 && communityRecipes.length === 0
    : communityRecipes.length === 0;

  return (
    <div>
      {error && <Alert variant="danger">{error}</Alert>}

      <div>
        {displayQuery && noResultsFound && (
          <Alert variant="info">
            {`No recipes found matching "${displayQuery}". Try a different search term.`}
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
                    <RecipeCard
                      recipe={recipe}
                      popIntensity="medium"
                      onRecipeUpdate={handleRecipeUpdate}
                    />
                  </Col>
                ))}
                {((userRecipesPage === userRecipesTotalPages && userRecipesTotal < queryLimit) ||
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
                  <RecipeCard
                    recipe={recipe}
                    popIntensity="subtle"
                    onRecipeUpdate={handleRecipeUpdate}
                  />
                </Col>
              ))}
              {!isAuthenticated &&
                ((communityRecipesPage === communityRecipesTotalPages &&
                  communityRecipes.length < queryLimit) ||
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
