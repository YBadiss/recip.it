import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en,fr;q=0.8,*;q=0.5',
}

const MAX_BYTES = 8 * 1024 * 1024

function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 6) {
    const a = address.toLowerCase()
    if (a.startsWith('::ffff:')) return isPrivateAddress(a.slice(7))
    return (
      a === '::1' ||
      a === '::' ||
      a.startsWith('fc') ||
      a.startsWith('fd') ||
      a.startsWith('fe80')
    )
  }
  const [a, b] = address.split('.').map(Number)
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  )
}

/** Rejects URLs that point at this server's own network (localhost, private ranges). */
async function assertPublicUrl(url: URL) {
  if (url.protocol !== 'http:' && url.protocol !== 'https:')
    throw new Error('Only http(s) URLs are supported')
  const host = url.hostname.replace(/^\[|\]$/g, '')
  const addresses = isIP(host)
    ? [host]
    : (await lookup(host, { all: true })).map((r) => r.address)
  if (addresses.some(isPrivateAddress))
    throw new Error('This URL points to a private address')
}

/** GETs a public web page as text, following redirects and re-checking each hop. */
export async function fetchPage(
  rawUrl: string,
): Promise<{ url: string; html: string }> {
  let url = new URL(rawUrl)
  for (let hop = 0; hop < 5; hop++) {
    await assertPublicUrl(url)
    const response = await fetch(url, {
      headers: BROWSER_HEADERS,
      redirect: 'manual',
      signal: AbortSignal.timeout(20_000),
    })
    const location = response.headers.get('location')
    if (response.status >= 300 && response.status < 400 && location) {
      url = new URL(location, url)
      continue
    }
    if (!response.ok)
      throw new Error(`The page answered with HTTP ${response.status}`)
    if (Number(response.headers.get('content-length') ?? 0) > MAX_BYTES)
      throw new Error('The page is too large')
    const html = await response.text()
    if (html.length > MAX_BYTES) throw new Error('The page is too large')
    return { url: url.toString(), html }
  }
  throw new Error('Too many redirects')
}
