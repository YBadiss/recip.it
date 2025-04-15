import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Launch as LaunchIcon,
} from '@mui/icons-material';
import { getRecipes, reimportRecipe, deleteRecipe } from '../services/api';
import { Recipe } from '../utils/types';

// Get frontend URL from environment variables with fallback
const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || 'http://localhost:8080';

const RecipesPage = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  const fetchRecipes = async () => {
    try {
      setLoading(true);
      const data = await getRecipes();
      setRecipes(data);
      setError('');
    } catch (error) {
      console.error('Error fetching recipes:', error);
      setError('Failed to fetch recipes. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

  const handleReimport = async (recipe: Recipe) => {
    if (!recipe.id) return;

    try {
      setActionInProgress(true);
      await reimportRecipe(recipe.id);
      setNotification(`Recipe "${recipe.title}" reimported successfully`);
      // Refresh the recipe list
      fetchRecipes();
    } catch (error) {
      console.error('Error reimporting recipe:', error);
      setNotification(`Failed to reimport recipe "${recipe.title}"`);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRecipe || !selectedRecipe.id) return;

    try {
      setActionInProgress(true);
      await deleteRecipe(selectedRecipe.id);
      setDeleteDialogOpen(false);
      setNotification(`Recipe "${selectedRecipe.title}" deleted successfully`);
      // Refresh the recipe list
      fetchRecipes();
    } catch (error) {
      console.error('Error deleting recipe:', error);
      setNotification(`Failed to delete recipe "${selectedRecipe.title}"`);
    } finally {
      setActionInProgress(false);
      setSelectedRecipe(null);
    }
  };

  const openDeleteDialog = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedRecipe(null);
  };

  const closeNotification = () => {
    setNotification('');
  };

  if (loading && recipes.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && recipes.length === 0) {
    return (
      <Box sx={{ mt: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Recipes
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Website</TableCell>
              <TableCell>Source</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {recipes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No recipes found
                </TableCell>
              </TableRow>
            ) : (
              recipes.map(recipe => (
                <TableRow key={recipe.id}>
                  <TableCell>{recipe.title}</TableCell>
                  <TableCell>
                    {recipe.created_at ? new Date(recipe.created_at).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {recipe.id ? (
                      <Tooltip title="View on website">
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<LaunchIcon />}
                          href={`${FRONTEND_URL}/recipes/${recipe.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View
                        </Button>
                      </Tooltip>
                    ) : (
                      'N/A'
                    )}
                  </TableCell>
                  <TableCell>
                    {recipe.link ? (
                      <Button
                        size="small"
                        href={recipe.link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open Source
                      </Button>
                    ) : (
                      'N/A'
                    )}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      color="primary"
                      onClick={() => handleReimport(recipe)}
                      disabled={actionInProgress || !recipe.link}
                      title="Reimport"
                    >
                      <RefreshIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => openDeleteDialog(recipe)}
                      disabled={actionInProgress}
                      title="Delete"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={deleteDialogOpen} onClose={closeDeleteDialog}>
        <DialogTitle>Confirm Recipe Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the recipe &quot;{selectedRecipe?.title}&quot;? This
            action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog} disabled={actionInProgress}>
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" disabled={actionInProgress}>
            {actionInProgress ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={closeNotification}
        message={notification}
      />
    </Box>
  );
};

export default RecipesPage;
