import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useCallback } from 'react'
import { currentUserQuery } from './queries'
import type { User } from './recipe'

export function useCurrentUser(): User | null {
  return useQuery(currentUserQuery).data ?? null
}

/** After login, register or logout: store the new user and refetch everything that depends on it. */
export function useSetCurrentUser() {
  const queryClient = useQueryClient()
  const router = useRouter()
  return useCallback(
    async (user: User | null) => {
      queryClient.setQueryData(currentUserQuery.queryKey, user)
      await queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] !== 'me',
      })
      await router.invalidate()
    },
    [queryClient, router],
  )
}
