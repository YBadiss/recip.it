import { createMiddleware, createStart } from '@tanstack/react-start'

/**
 * `recipit.me/https://example.com/recipe` imports that recipe: prefixing any URL with the site's address
 * sends it to /add. Handled on the raw request, before the router normalizes the `//` in the path.
 */
const importShortcut = createMiddleware().server(async ({ request, next }) => {
  const { pathname, search, origin } = new URL(request.url)
  const match = pathname.match(/^\/(https?):\/\/?(.+)$/i)
  if (!match) return next()
  const target = `${match[1].toLowerCase()}://${match[2]}${search}`
  return Response.redirect(
    `${origin}/add?url=${encodeURIComponent(target)}`,
    302,
  )
})

export const startInstance = createStart(() => ({
  requestMiddleware: [importShortcut],
}))
