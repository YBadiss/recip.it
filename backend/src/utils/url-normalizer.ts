/**
 * Utility for normalizing URLs to avoid duplicate recipe imports
 */

/**
 * Normalize a URL by:
 * - Converting to lowercase
 * - Removing tracking parameters (utm_*, fbclid, etc.)
 * - Removing hash fragments
 * - Ensuring consistent protocol (https)
 * - Removing trailing slashes
 * - Removing 'www.' prefix
 *
 * @param url The URL to normalize
 * @returns The normalized URL
 */
export function normalizeUrl(url: string): string {
  try {
    // Parse the URL
    const urlObj = new URL(url.trim());

    // Convert to lowercase
    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname;

    // Remove 'www.' prefix
    const cleanHostname = hostname.startsWith('www.') ? hostname.substring(4) : hostname;

    // Remove tracking parameters
    const searchParams = new URLSearchParams();
    for (const [key, value] of urlObj.searchParams.entries()) {
      // Skip common tracking parameters
      if (
        !key.startsWith('utm_') &&
        !['fbclid', 'gclid', '_ga', 'ref', 'source', 'campaign'].includes(key)
      ) {
        searchParams.append(key, value);
      }
    }

    // Rebuild the URL (ignoring hash fragment)
    let normalizedUrl = `https://${cleanHostname}${pathname}`;

    // Remove trailing slash
    if (normalizedUrl.endsWith('/') && normalizedUrl.length > 8) {
      // 8 = 'https://'.length
      normalizedUrl = normalizedUrl.slice(0, -1);
    }

    // Append clean search params if any exist
    const searchString = searchParams.toString();
    if (searchString) {
      normalizedUrl += `?${searchString}`;
    }

    return normalizedUrl;
  } catch (error) {
    // If URL parsing fails, return original URL
    console.error(`Error normalizing URL: ${url}`, error);
    return url;
  }
}
