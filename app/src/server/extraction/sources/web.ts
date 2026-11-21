import * as cheerio from 'cheerio'
import { fetchPage } from './fetch'
import type { SourceContent } from '../types'

const MAX_TEXT = 60_000
const MAX_TEXT_WITH_JSON_LD = 15_000

type JsonObject = Record<string, unknown>

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isRecipeNode(node: JsonObject): boolean {
  const type = node['@type']
  return type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))
}

/** Finds a schema.org Recipe in JSON-LD, which may be nested in arrays, @graph, or other nodes. */
export function findJsonLdRecipe(blocks: unknown[]): JsonObject | undefined {
  const queue = [...blocks]
  while (queue.length) {
    const node = queue.shift()
    if (Array.isArray(node)) queue.push(...node)
    else if (isObject(node)) {
      if (isRecipeNode(node)) return node
      queue.push(...Object.values(node).filter((v) => typeof v === 'object'))
    }
  }
  return undefined
}

function imageFromJsonLd(image: unknown): string | undefined {
  if (typeof image === 'string') return image
  if (Array.isArray(image)) return imageFromJsonLd(image[0])
  if (isObject(image) && typeof image.url === 'string') return image.url
  return undefined
}

/** Keeps the fields that matter for extraction, so the model gets a compact, accurate input. */
function compactRecipe(recipe: JsonObject): JsonObject {
  const keys = [
    'name',
    'description',
    'recipeYield',
    'prepTime',
    'cookTime',
    'totalTime',
    'recipeCategory',
    'recipeCuisine',
    'keywords',
    'suitableForDiet',
    'tool',
    'recipeIngredient',
    'recipeInstructions',
  ]
  return Object.fromEntries(
    keys.filter((k) => recipe[k] !== undefined).map((k) => [k, recipe[k]]),
  )
}

function absoluteUrl(value: string | undefined, base: string): string {
  if (!value) return ''
  try {
    return new URL(value, base).toString()
  } catch {
    return ''
  }
}

export function parsePage(url: string, html: string): SourceContent {
  const $ = cheerio.load(html)

  const jsonLd: unknown[] = []
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      jsonLd.push(JSON.parse($(el).text()))
    } catch {
      // Ignore malformed blocks.
    }
  })
  const recipe = findJsonLdRecipe(jsonLd)

  const title =
    $('meta[property="og:title"]').attr('content') || $('title').text().trim()
  const imageUrl = absoluteUrl(
    (recipe && imageFromJsonLd(recipe.image)) ||
      $('meta[property="og:image"]').attr('content'),
    url,
  )

  $(
    'script, style, noscript, iframe, svg, nav, header, footer, form, aside',
  ).remove()
  const pageText = $('body').text().replace(/\s+/g, ' ').trim()

  const sections = [`Source URL: ${url}`]
  if (title) sections.push(`Page title: ${title}`)
  if (recipe) {
    sections.push(
      `# Structured recipe data from the page (schema.org)\n${JSON.stringify(compactRecipe(recipe))}`,
    )
    sections.push(
      `# Page text (may contain extra tips)\n${pageText.slice(0, MAX_TEXT_WITH_JSON_LD)}`,
    )
  } else {
    sections.push(`# Page text\n${pageText.slice(0, MAX_TEXT)}`)
  }

  return { text: sections.join('\n\n'), media: [], imageUrl }
}

export async function fetchWebPage(url: string): Promise<SourceContent> {
  const page = await fetchPage(url)
  return parsePage(page.url, page.html)
}
