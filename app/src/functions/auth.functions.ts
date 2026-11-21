import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { withUser } from './middleware'
import {
  checkPassword,
  endSession,
  hashPassword,
  startSession,
} from '#/server/auth.server'

const Credentials = z.object({
  username: z.string().trim().min(1, 'Username is required').max(64),
  password: z.string().min(1, 'Password is required').max(200),
})

export const getCurrentUser = createServerFn({ method: 'GET' })
  .middleware([withUser])
  .handler(async ({ context }) => context.user)

export const login = createServerFn({ method: 'POST' })
  .validator(Credentials)
  .middleware([withUser])
  .handler(async ({ data, context }) => {
    const user = context.store.getUserWithPassword(data.username)
    const valid = await checkPassword(data.password, user?.passwordHash)
    if (!user || !valid) throw new Error('Invalid username or password')
    const { passwordHash: _, ...publicUser } = user
    startSession(publicUser)
    return publicUser
  })

export const register = createServerFn({ method: 'POST' })
  .validator(
    Credentials.extend({
      password: z.string().min(8, 'Use at least 8 characters').max(200),
    }),
  )
  .middleware([withUser])
  .handler(async ({ data, context }) => {
    const user = context.store.createUser(
      data.username,
      await hashPassword(data.password),
    )
    startSession(user)
    return user
  })

export const logout = createServerFn({ method: 'POST' }).handler(async () => {
  endSession()
  return null
})
