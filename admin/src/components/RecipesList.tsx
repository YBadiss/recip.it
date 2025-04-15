import { Box, Chip, Typography, Card, CardContent, CardMedia, Stack } from '@mui/material';
import { Recipe } from '../utils/types';

interface RecipesListProps {
  recipes: Recipe[];
}

const RecipesList: React.FC<RecipesListProps> = ({ recipes }) => {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
      {recipes.map(recipe => (
        <Box key={recipe.id || 'temp-id'} sx={{ width: { xs: '100%', sm: '45%', md: '30%' } }}>
          <Card>
            {recipe.imageUrl && (
              <CardMedia component="img" height="140" image={recipe.imageUrl} alt={recipe.title} />
            )}
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {recipe.title}
              </Typography>

              <Stack direction="row" spacing={1} flexWrap="wrap" mb={1}>
                {recipe.tags?.map((tag, index) => <Chip key={index} label={tag} size="small" />)}
              </Stack>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                {recipe.cookingTime && (
                  <Typography variant="body2" color="text.secondary">
                    Time: {recipe.cookingTime}
                  </Typography>
                )}
                {recipe.servings && (
                  <Typography variant="body2" color="text.secondary">
                    Serves: {recipe.servings}
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Box>
      ))}
    </Box>
  );
};

export default RecipesList;
