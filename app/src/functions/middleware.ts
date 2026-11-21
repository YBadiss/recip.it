import { createMiddleware } from '@tanstack/react-start'
import { readSessionUser } from '#/server/auth.server'
import { getServices } from '#/server/context.server'

/** Adds the services and the signed-in user (or null) to the context. */
export const withUser = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    return next({ context: { user: readSessionUser(), ...getServices() } })
  },
)

export const requireUser = createMiddleware({ type: 'function' })
  .middleware([withUser])
  .server(async ({ next, context }) => {
    if (!context.user) throw new Error('Please log in first')
    return next({ context: { user: context.user } })
  })

export const requireAdmin = createMiddleware({ type: 'function' })
  .middleware([requireUser])
  .server(async ({ next, context }) => {
    if (!context.user.isAdmin) throw new Error('Admin access required')
    return next()
  })
