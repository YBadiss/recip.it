import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const RecipeImportPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Get the full path
    const fullPath = location.pathname;

    console.log('Full path:', fullPath);

    // Extract the URL to import (remove the leading slash)
    // The path will be something like "/https://example.com/recipe"
    let importUrl = fullPath.startsWith('/http') ? fullPath.substring(1) : '';

    // Preserve query parameters from the original URL
    if (importUrl && location.search) {
      // Check if the extracted URL already has query parameters
      importUrl += importUrl.includes('?') ? '&' + location.search.substring(1) : location.search;
    }

    console.log('Import URL:', importUrl);

    // Check if the URL is valid
    if (importUrl && importUrl.startsWith('http')) {
      // Redirect to AddRecipePage with the URL as a parameter
      navigate(`/add?url=${encodeURIComponent(importUrl)}`);
    } else {
      // If URL is invalid, redirect to add page
      navigate('/add');
    }
  }, [location.pathname, location.search, navigate]);

  // Return null as this is just a redirect component
  return null;
};

export default RecipeImportPage;
