import React, { useEffect, useState } from 'react';
import { Row, Col, Alert } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';
import { Recipe } from '../types/recipe';
import { recipeApi } from '../services/api';
import SearchBar from '../components/SearchBar';
import RecipeCard from '../components/RecipeCard';
import LoadingSpinner from '../components/LoadingSpinner';

const HomePage: React.FC = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await recipeApi.getAll(searchQuery);
        setRecipes(data);
      } catch (err) {
        console.error('Error fetching recipes:', err);
        setError('Failed to load recipes. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchRecipes();
  }, [searchQuery]);

  const handleSearch = (query: string) => {
    const params = new URLSearchParams();
    if (query) {
      params.set('q', query);
    }
    setSearchParams(params);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <h1 className="mb-4">My Recipes</h1>

      <SearchBar onSearch={handleSearch} initialValue={searchQuery} />

      {error && <Alert variant="danger">{error}</Alert>}

      {recipes.length === 0 ? (
        <Alert variant="info">
          {searchQuery
            ? `No recipes found matching "${searchQuery}". Try a different search term.`
            : 'No recipes found. Click "Import Recipe" to add your first recipe!'}
        </Alert>
      ) : (
        <Row xs={1} md={2} lg={3} className="g-4">
          {recipes.map(recipe => (
            <Col key={recipe.id}>
              <RecipeCard recipe={recipe} />
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
};

export default HomePage;
