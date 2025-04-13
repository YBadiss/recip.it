import React, { useEffect, useState } from 'react';
import { Row, Col, Alert } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';
import { Recipe } from '../types/recipe';
import { recipeApi } from '../services/api';
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

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <SearchBar onSearch={handleSearch} onSubmit={handleSearchSubmit} initialValue={searchQuery} />

      {error && <Alert variant="danger">{error}</Alert>}

      {filteredRecipes.length === 0 && !searchQuery ? (
        <Row xs={1} md={2} lg={3} className="g-4">
          <Col>
            <ImportRecipeCard popIntensity="medium" />
          </Col>
        </Row>
      ) : filteredRecipes.length === 0 && searchQuery ? (
        <div>
          <Alert variant="info">
            {`No recipes found matching "${searchQuery}". Try a different search term.`}
          </Alert>
          <Row xs={1} md={2} lg={3} className="g-4 mt-3">
            <Col>
              <ImportRecipeCard popIntensity="medium" />
            </Col>
          </Row>
        </div>
      ) : (
        <Row xs={1} md={2} lg={3} className="g-4">
          {/* Recipe Cards */}
          {filteredRecipes.map(recipe => (
            <Col key={recipe.id}>
              <RecipeCard recipe={recipe} popIntensity="medium" />
            </Col>
          ))}
          
          {/* Import Recipe Card - always at the end of the list */}
          <Col>
            <ImportRecipeCard popIntensity="medium" />
          </Col>
        </Row>
      )}
    </div>
  );
};

export default HomePage;
