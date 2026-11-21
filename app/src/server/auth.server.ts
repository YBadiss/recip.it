import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import type { SignOptions } from 'jsonwebtoken'
import {
  deleteCookie,
  getCookie,
  setCookie,
} from '@tanstack/react-start/server'
import { config } from './config.server'
import { getServices } from './context.server'
import type { User } from '#/lib/recipe'

const MAX_AGE_SECONDS = 30 * 24 * 60 * 60

function cookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax' as const,
    path: '/',
  }
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

let dummyHash: string | undefined

/** Checks a password; with no hash (unknown user) it still runs bcrypt, so timing does not reveal usernames. */
export async function checkPassword(
  password: string,
  hash: string | undefined,
): Promise<boolean> {
  dummyHash ??= await bcrypt.hash('not-a-real-password', 10)
  const valid = await bcrypt.compare(password, hash ?? dummyHash)
  return valid && hash !== undefined
}

export function startSession(user: User): void {
  const token = jwt.sign(
    { sub: user.id, username: user.username },
    config.jwtSecret,
    {
      expiresIn: config.jwtExpiration as SignOptions['expiresIn'],
    },
  )
  setCookie(config.cookieName, token, {
    ...cookieOptions(),
    maxAge: MAX_AGE_SECONDS,
  })
}

export function endSession(): void {
  deleteCookie(config.cookieName, cookieOptions())
}

/** The signed-in user, read fresh from the database so permission changes apply immediately. */
export function readSessionUser(): User | null {
  const token = getCookie(config.cookieName)
  if (!token) return null
  try {
    const payload = jwt.verify(token, config.jwtSecret)
    const userId = typeof payload === 'object' ? payload.sub : undefined
    return userId ? getServices().store.getUser(userId) : null
  } catch {
    return null
  }
}
