const TRACKING_PARAMS = new Set([
  'fbclid',
  'gclid',
  '_ga',
  'ref',
  'source',
  'campaign',
  'igsh',
  'si',
])

/**
 * Normalize a URL so the same recipe is not imported twice: https, no `www.`/`m.`, no tracking
 * parameters, no hash, no trailing slash, and YouTube links reduced to `youtube.com/watch?v=<id>`.
 * Returns the input unchanged if it is not a valid URL.
 */
export function normalizeUrl(url: string): string {
  let parsed: URL
  try {
    parsed = new URL(url.trim())
  } catch {
    return url
  }

  let hostname = parsed.hostname.toLowerCase().replace(/^(www|m)\./, '')
  let pathname = parsed.pathname
  const params = new URLSearchParams()

  const youtubeId =
    hostname === 'youtu.be'
      ? pathname.slice(1).split('/')[0]
      : hostname === 'youtube.com'
        ? (parsed.searchParams.get('v') ??
          pathname.match(/^\/(?:shorts|live)\/([\w-]{11})/)?.[1])
        : undefined

  if (youtubeId) {
    hostname = 'youtube.com'
    pathname = '/watch'
    params.append('v', youtubeId)
  } else {
    for (const [key, value] of parsed.searchParams) {
      if (!key.startsWith('utm_') && !TRACKING_PARAMS.has(key))
        params.append(key, value)
    }
  }

  let normalized = `https://${hostname}${pathname}`
  if (normalized.endsWith('/') && pathname !== '/')
    normalized = normalized.slice(0, -1)
  if (pathname === '/') normalized = `https://${hostname}`

  const search = params.toString()
  return search ? `${normalized}?${search}` : normalized
}

export function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}
