import type { Recipe } from './recipe'

/** Lowercase and strip accents, so "creme brulee" matches "Crème brûlée". */
export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

function searchableText(recipe: Recipe): string {
  return normalizeText(
    [
      recipe.title,
      ...recipe.ingredients.map((i) => i.name),
      ...recipe.materials.map((m) => m.name),
      ...recipe.steps.map((s) => s.action),
      ...recipe.tags,
    ].join(' '),
  )
}

/** Recipes whose text contains every word of the query (empty query matches everything). */
export function filterRecipes<T extends Recipe>(
  recipes: T[],
  query: string,
): T[] {
  const words = normalizeText(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return recipes
  return recipes.filter((recipe) => {
    const text = searchableText(recipe)
    return words.every((word) => text.includes(word))
  })
}
