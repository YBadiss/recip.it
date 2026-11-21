import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Button, Modal, Table } from 'react-bootstrap'
import { toast } from 'react-toastify'
import { deleteRecipe, reimportRecipe } from '#/functions/recipes.functions'
import { errorMessage, recipesQuery } from '#/lib/queries'
import { isFileLink } from '#/lib/recipe'
import type { Recipe } from '#/lib/recipe'

export const Route = createFileRoute('/admin/recipes')({
  loader: ({ context }) => context.queryClient.ensureQueryData(recipesQuery),
  component: RecipesAdminPage,
})

function RecipesAdminPage() {
  const queryClient = useQueryClient()
  const { data: recipes } = useSuspenseQuery(recipesQuery)
  const [toDelete, setToDelete] = useState<Recipe | null>(null)

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['recipes'] })

  const reimport = useMutation({
    mutationFn: (recipe: Recipe) => reimportRecipe({ data: { id: recipe.id } }),
    onSuccess: async (_, recipe) => {
      toast.success(`"${recipe.title}" reimported`)
      await refresh()
    },
    onError: (error, recipe) =>
      toast.error(errorMessage(error, `Failed to reimport "${recipe.title}"`)),
  })

  const remove = useMutation({
    mutationFn: (recipe: Recipe) => deleteRecipe({ data: { id: recipe.id } }),
    onSuccess: async (_, recipe) => {
      toast.success(`"${recipe.title}" deleted`)
      setToDelete(null)
      await refresh()
    },
    onError: (error, recipe) =>
      toast.error(errorMessage(error, `Failed to delete "${recipe.title}"`)),
  })

  const busy = reimport.isPending || remove.isPending

  return (
    <>
      <Table responsive hover className="bg-white align-middle">
        <thead>
          <tr>
            <th>Title</th>
            <th>Created</th>
            <th>Source</th>
            <th className="text-end">Actions</th>
          </tr>
        </thead>
        <tbody>
          {recipes.length === 0 ? (
            <tr>
              <td colSpan={4} className="text-center">
                No recipes found
              </td>
            </tr>
          ) : (
            recipes.map((recipe) => (
              <tr key={recipe.id}>
                <td>
                  <Link to="/recipes/$id" params={{ id: recipe.id }}>
                    {recipe.title}
                  </Link>
                </td>
                <td>{recipe.created_at.slice(0, 10)}</td>
                <td>
                  {isFileLink(recipe.link) ? (
                    <span className="text-muted">Uploaded file</span>
                  ) : (
                    <a
                      href={recipe.link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open source
                    </a>
                  )}
                </td>
                <td className="text-end text-nowrap">
                  <Button
                    size="sm"
                    variant="outline-primary"
                    className="me-2"
                    title="Reimport"
                    disabled={busy || isFileLink(recipe.link)}
                    onClick={() => reimport.mutate(recipe)}
                  >
                    <i
                      className={`bi bi-arrow-clockwise ${reimport.variables?.id === recipe.id && reimport.isPending ? 'spin' : ''}`}
                    ></i>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline-danger"
                    title="Delete"
                    disabled={busy}
                    onClick={() => setToDelete(recipe)}
                  >
                    <i className="bi bi-trash"></i>
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      <Modal show={!!toDelete} onHide={() => setToDelete(null)}>
        <Modal.Header closeButton>
          <Modal.Title>Delete recipe</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Delete &quot;{toDelete?.title}&quot; for everyone? This cannot be
          undone.
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setToDelete(null)}
            disabled={remove.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => toDelete && remove.mutate(toDelete)}
            disabled={remove.isPending}
          >
            {remove.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}
