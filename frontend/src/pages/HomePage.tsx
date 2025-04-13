import React, { useEffect, useState } from 'react';
import { Row, Col, Alert } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';
import { Recipe } from '../types/recipe';
import { recipeApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import SearchBar from '../components/SearchBar';
import RecipeCard from '../components/RecipeCard';
import ImportRecipeCard from '../components/ImportRecipeCard';
import LoadingSpinner from '../components/LoadingSpinner';

const HomePage: React.FC = () => {
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const { isAuthenticated } = useAuth();

  // Initial data fetch - load all recipes once
  useEffect(() => {
    const fetchAllRecipes = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await recipeApi.getAll();
        setAllRecipes(data);
        setFilteredRecipes(data);
      } catch (err) {
        console.error('Error fetching recipes:', err);
        setError('Failed to load recipes. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchAllRecipes();
  }, []);

  // Apply client-side filtering when search query changes
  useEffect(() => {
    if (!searchQuery) {
      setFilteredRecipes(allRecipes);
      return;
    }

    const lowercaseQuery = searchQuery.toLowerCase();
    const filtered = allRecipes.filter(
      recipe =>
        recipe.title.toLowerCase().includes(lowercaseQuery) ||
        (recipe.description && recipe.description.toLowerCase().includes(lowercaseQuery)) ||
        (recipe.tags && recipe.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)))
    );

    setFilteredRecipes(filtered);
  }, [searchQuery, allRecipes]);

  // Update URL when search is explicitly submitted (not on every keystroke)
  const handleSearchSubmit = (query: string) => {
    const params = new URLSearchParams();
    if (query) {
      params.set('q', query);
    }
    setSearchParams(params);
  };

  // Handle real-time search updates
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // Handle recipe updates from RecipeCard components
  const handleRecipeUpdate = (updatedRecipe: Recipe) => {
    // Update the recipe in both state arrays
    const updateRecipeInArray = (recipes: Recipe[]) =>
      recipes.map(r => (r.id === updatedRecipe.id ? updatedRecipe : r));

    setAllRecipes(updateRecipeInArray(allRecipes));
    setFilteredRecipes(updateRecipeInArray(filteredRecipes));
  };

  // Separate recipes into "My Recipes" and "Community Recipes"
  // Only filter by user list if authenticated
  const myRecipes = isAuthenticated ? filteredRecipes.filter(recipe => recipe.inUserList) : [];
  const communityRecipes = isAuthenticated
    ? filteredRecipes.filter(recipe => !recipe.inUserList)
    : filteredRecipes;

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <SearchBar onSearch={handleSearch} onSubmit={handleSearchSubmit} initialValue={searchQuery} />

      {error && <Alert variant="danger">{error}</Alert>}

      {filteredRecipes.length === 0 && !searchQuery ? (
        <div>
          <div className="mb-5">
            <h2 className="mb-4">
              <i className="bi bi-star-fill text-warning me-2" style={{ fontSize: '1.75rem' }}></i>
              My Recipes
            </h2>
            <Row xs={1} md={2} lg={3} className="g-4">
              <Col>
                <ImportRecipeCard popIntensity="medium" />
              </Col>
            </Row>
          </div>
        </div>
      ) : filteredRecipes.length === 0 && searchQuery ? (
        <div>
          <Alert variant="info">
            {`No recipes found matching "${searchQuery}". Try a different search term.`}
          </Alert>
          <div className="mb-5">
            <h2 className="mb-4">
              <i className="bi bi-star-fill text-warning me-2" style={{ fontSize: '1.75rem' }}></i>
              My Recipes
            </h2>
            <Row xs={1} md={2} lg={3} className="g-4">
              <Col>
                <ImportRecipeCard popIntensity="medium" />
              </Col>
            </Row>
          </div>
        </div>
      ) : (
        <div>
          {/* My Recipes Section */}
          {myRecipes.length > 0 && (
            <div className="mb-5">
              <h2 className="mb-4">
                <i
                  className="bi bi-star-fill text-warning me-2"
                  style={{ fontSize: '1.75rem' }}
                ></i>
                My Recipes
              </h2>
              <Row xs={1} md={2} lg={3} className="g-4">
                {myRecipes.map(recipe => (
                  <Col key={recipe.id}>
                    <RecipeCard
                      recipe={recipe}
                      popIntensity="medium"
                      onRecipeUpdate={handleRecipeUpdate}
                    />
                  </Col>
                ))}
                <Col>
                  <ImportRecipeCard popIntensity="medium" />
                </Col>
              </Row>
            </div>
          )}

          {/* Show Import Card with My Recipes title if no recipes yet */}
          {myRecipes.length === 0 && (
            <div className="mb-5">
              <h2 className="mb-4">
                <i
                  className="bi bi-star-fill text-warning me-2"
                  style={{ fontSize: '1.75rem' }}
                ></i>
                My Recipes
              </h2>
              <Row xs={1} md={2} lg={3} className="g-4">
                <Col>
                  <ImportRecipeCard popIntensity="medium" />
                </Col>
              </Row>
            </div>
          )}

          {/* Community Recipes Section */}
          {communityRecipes.length > 0 && (
            <div>
              <h2 className="mb-4">
                <i className="bi bi-globe text-primary me-2" style={{ fontSize: '1.75rem' }}></i>
                Community Recipes
              </h2>
              <Row xs={1} md={2} lg={3} className="g-4">
                {communityRecipes.map(recipe => (
                  <Col key={recipe.id}>
                    <RecipeCard
                      recipe={recipe}
                      popIntensity="subtle"
                      onRecipeUpdate={handleRecipeUpdate}
                    />
                  </Col>
                ))}
              </Row>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HomePage;
