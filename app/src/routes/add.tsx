import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Breadcrumb,
  Button,
  ButtonGroup,
  Card,
  Form,
  ToggleButton,
} from 'react-bootstrap'
import { z } from 'zod'
import { LoadingSpinner } from '#/components/LoadingSpinner'
import {
  importRecipeFromFile,
  importRecipeFromUrl,
} from '#/functions/recipes.functions'
import {
  ACCEPTED_FILE_TYPES,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_MB,
} from '#/lib/files'
import { errorMessage } from '#/lib/queries'
import { isHttpUrl } from '#/lib/url'

type SourceType = 'website' | 'video' | 'upload'

const SOURCES: Array<{
  value: SourceType
  label: string
  help: string
  placeholder?: string
}> = [
  {
    value: 'website',
    label: 'Recipe Website',
    help: 'Paste the link of a recipe page from any website.',
    placeholder: 'https://example.com/recipe',
  },
  {
    value: 'video',
    label: 'Video',
    help: 'Paste a YouTube, TikTok, Instagram or X video showing a recipe.',
    placeholder: 'https://youtube.com/watch?v=...',
  },
  {
    value: 'upload',
    label: 'Photo or File',
    help: `Upload a photo of a recipe (cookbook page, handwritten card, screenshot), a PDF or a text file. Max ${MAX_UPLOAD_MB} MB.`,
  },
]

export const Route = createFileRoute('/add')({
  validateSearch: z.object({ url: z.string().optional() }),
  head: () => ({ meta: [{ title: 'Add Recipe - Recip.it' }] }),
  component: AddRecipePage,
})

function guessSourceType(url: string): SourceType {
  return /(youtube\.com|youtu\.be|tiktok\.com|instagram\.com|(^|\/\/|\.)x\.com|twitter\.com)/i.test(
    url,
  )
    ? 'video'
    : 'website'
}

function AddRecipePage() {
  const { url: urlParam } = Route.useSearch()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [sourceType, setSourceType] = useState<SourceType>(
    urlParam ? guessSourceType(urlParam) : 'website',
  )
  const [url, setUrl] = useState(urlParam ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const autoImported = useRef(false)

  const importRecipe = useMutation({
    mutationFn: (input: { url: string } | { file: File }) => {
      if ('url' in input)
        return importRecipeFromUrl({ data: { url: input.url } })
      const formData = new FormData()
      formData.append('file', input.file)
      return importRecipeFromFile({ data: formData })
    },
    onSuccess: async ({ id }) => {
      await queryClient.invalidateQueries({ queryKey: ['recipes'] })
      await navigate({ to: '/recipes/$id', params: { id } })
    },
  })

  // /add?url=... (and recipit.me/<recipe url>) import straight away.
  useEffect(() => {
    if (urlParam && isHttpUrl(urlParam) && !autoImported.current) {
      autoImported.current = true
      importRecipe.mutate({ url: urlParam })
    }
  }, [urlParam])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)
    if (sourceType === 'upload') {
      if (!file) return setValidationError('Please choose a file to upload')
      if (file.size > MAX_UPLOAD_BYTES)
        return setValidationError(
          `File too large. Maximum size is ${MAX_UPLOAD_MB} MB.`,
        )
      importRecipe.mutate({ file })
    } else {
      if (!isHttpUrl(url.trim()))
        return setValidationError('Please enter a valid URL')
      importRecipe.mutate({ url: url.trim() })
    }
  }

  if (importRecipe.isPending) {
    return (
      <LoadingSpinner message="The Reci'Pear is gathering your ingredients..." />
    )
  }

  const source = SOURCES.find((s) => s.value === sourceType)!
  const error =
    validationError ??
    (importRecipe.error ? errorMessage(importRecipe.error) : null)

  return (
    <div className="py-4">
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
            Add a recipe from a website, a video or a photo. We&apos;ll extract
            the ingredients, steps, and other details automatically.
          </Card.Text>

          <div className="d-flex justify-content-center mb-3">
            <ButtonGroup>
              {SOURCES.map((s) => (
                <ToggleButton
                  key={s.value}
                  id={`source-${s.value}`}
                  type="radio"
                  variant="outline-primary"
                  name="source-type"
                  value={s.value}
                  checked={sourceType === s.value}
                  onChange={() => {
                    setSourceType(s.value)
                    setValidationError(null)
                    importRecipe.reset()
                  }}
                >
                  {s.label}
                </ToggleButton>
              ))}
            </ButtonGroup>
          </div>

          <Card.Text>{source.help}</Card.Text>

          {error && <Alert variant="danger">{error}</Alert>}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              {sourceType === 'upload' ? (
                <Form.Control
                  type="file"
                  accept={ACCEPTED_FILE_TYPES}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFile(e.target.files?.[0] ?? null)
                  }
                />
              ) : (
                <Form.Control
                  type="url"
                  inputMode="url"
                  placeholder={source.placeholder}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              )}
            </Form.Group>
            <div className="d-grid">
              <Button variant="outline-primary" type="submit">
                Add Recipe
              </Button>
            </div>
          </Form>

          {sourceType !== 'upload' && (
            <Alert variant="info" className="mt-4">
              <Alert.Heading>Pro Tip</Alert.Heading>
              <p>
                You can also add recipes from anywhere by prefixing any recipe
                URL with <code>https://recipit.me/</code>
              </p>
              <p className="mb-0">
                Example:{' '}
                <code>https://recipit.me/https://example.com/great-recipe</code>
              </p>
            </Alert>
          )}
        </Card.Body>
      </Card>
    </div>
  )
}
