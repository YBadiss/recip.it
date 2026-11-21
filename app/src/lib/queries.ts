import { queryOptions } from '@tanstack/react-query'
import { getCurrentUser } from '#/functions/auth.functions'
import {
  getRecipe,
  listRecipes,
  listUsers,
} from '#/functions/recipes.functions'

export const currentUserQuery = queryOptions({
  queryKey: ['me'],
  queryFn: () => getCurrentUser(),
  staleTime: 5 * 60_000,
})

export const recipesQuery = queryOptions({
  queryKey: ['recipes'],
  queryFn: () => listRecipes(),
  staleTime: 60_000,
})

export const recipeQuery = (id: string) =>
  queryOptions({
    queryKey: ['recipes', id],
    queryFn: () => getRecipe({ data: { id } }),
  })

export const usersQuery = queryOptions({
  queryKey: ['users'],
  queryFn: () => listUsers(),
})

/** Turns a server function error into a message worth showing to the user. */
export function errorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (error instanceof Error && error.message) return error.message
  return fallback
}
