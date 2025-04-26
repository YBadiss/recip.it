import React, { useState, useRef } from 'react';
import {
  Container,
  Card,
  Form,
  Button,
  Alert,
  Breadcrumb,
  ToggleButton,
  ButtonGroup,
} from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { recipeService } from '../services/recipeService';
import LoadingSpinner from '../components/LoadingSpinner';

const AddRecipePage: React.FC = () => {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [sourceType, setSourceType] = useState('recipe'); // 'recipe', 'youtube', or 'upload'
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateUrl = (value: string): boolean => {
    if (!value) {
      setUrlError('Please enter a URL');
      return false;
    }

    try {
      new URL(value);
      setUrlError(null);
      return true;
    } catch {
      setUrlError('Please enter a valid URL');
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (sourceType === 'upload') {
      if (!selectedFile) {
        setError('Please select a file to upload');
        return;
      }
    } else {
      if (!validateUrl(url)) {
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      let recipe;

      if (sourceType === 'upload') {
        const formData = new FormData();
        formData.append('recipe', selectedFile as File);
        recipe = await recipeService.importFile(formData);
      } else {
        recipe = await recipeService.import({ link: url });
      }

      if (recipe && recipe.id) {
        navigate(`/recipes/${recipe.id}`);
      } else {
        setError('Failed to process recipe. Please try again with a different source.');
      }
    } catch (err) {
      if (sourceType === 'upload') {
        setError(
          'Failed to process the uploaded file. Make sure it contains valid recipe content.'
        );
      } else {
        setError('Failed to add recipe. The URL may not contain a valid recipe.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleSourceTypeChange = (type: string) => {
    setSourceType(type);
    setError(null);

    if (type === 'upload') {
      setUrl('');
      setUrlError(null);
    } else {
      setSelectedFile(null);
    }
  };

  if (loading) {
    return <LoadingSpinner message="The Reci'Pear is gathering your ingredients..." />;
  }

  return (
    <Container className="py-4">
      {/* Breadcrumb navigation */}
      <Breadcrumb className="mb-3">
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/' }}>
          Recipes
        </Breadcrumb.Item>
        <Breadcrumb.Item active>Add Recipe</Breadcrumb.Item>
      </Breadcrumb>

      <h1 className="mb-4">Add New Recipe</h1>

      <Card>
        <Card.Body>
          <Card.Text>
            Add a recipe by using a URL or uploading a document. We&apos;ll extract the ingredients,
            steps, and other details automatically.
          </Card.Text>

          <div className="d-flex justify-content-center mb-3">
            <ButtonGroup>
              <ToggleButton
                id="toggle-recipe"
                type="radio"
                variant="outline-primary"
                name="source-type"
                value="recipe"
                checked={sourceType === 'recipe'}
                onChange={e => handleSourceTypeChange(e.currentTarget.value)}
              >
                Recipe Website
              </ToggleButton>
              <ToggleButton
                id="toggle-youtube"
                type="radio"
                variant="outline-primary"
                name="source-type"
                value="youtube"
                checked={sourceType === 'youtube'}
                onChange={e => handleSourceTypeChange(e.currentTarget.value)}
              >
                YouTube Video
              </ToggleButton>
              <ToggleButton
                id="toggle-upload"
                type="radio"
                variant="outline-primary"
                name="source-type"
                value="upload"
                checked={sourceType === 'upload'}
                onChange={e => handleSourceTypeChange(e.currentTarget.value)}
              >
                Upload Document
              </ToggleButton>
            </ButtonGroup>
          </div>

          <Card.Text>
            {sourceType === 'recipe'
              ? 'Make sure the URL links directly to the recipe page from any recipe website.'
              : sourceType === 'youtube'
                ? 'Paste a YouTube video URL that contains a recipe or cooking demonstration.'
                : 'Upload a document file (PDF, Word, etc.) containing your recipe.'}
          </Card.Text>

          {error && <Alert variant="danger">{error}</Alert>}

          <Form onSubmit={handleSubmit}>
            {sourceType !== 'upload' ? (
              <Form.Group className="mb-3">
                <Form.Control
                  type="text"
                  placeholder={
                    sourceType === 'recipe'
                      ? 'https://example.com/recipe'
                      : 'https://youtube.com/watch?v=...'
                  }
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  isInvalid={!!urlError}
                />
                {urlError && (
                  <Form.Control.Feedback type="invalid">{urlError}</Form.Control.Feedback>
                )}
              </Form.Group>
            ) : (
              <Form.Group className="mb-3">
                <Form.Control type="file" ref={fileInputRef} onChange={handleFileChange} />
                {selectedFile && (
                  <div className="mt-2">
                    <span className="text-muted">Selected file: {selectedFile.name}</span>
                  </div>
                )}
              </Form.Group>
            )}

            <div className="d-grid">
              <Button variant="outline-primary" type="submit">
                Add Recipe
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default AddRecipePage;
