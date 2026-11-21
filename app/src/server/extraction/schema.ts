import { z } from 'zod'
import type { RecipeContent } from '#/lib/recipe'

// What the model returns. Every field is required and "missing" is `null`, which is what strict
// structured-output modes (OpenAI json_schema, Anthropic, Gemini) handle best.
export const ExtractionSchema = z.object({
  isRecipe: z.boolean().meta({
    description:
      'false when the content does not contain a recipe; the other fields are then ignored',
  }),
  title: z.string(),
  ingredients: z.array(
    z.object({
      id: z.string().meta({ description: 'Unique id such as "ing1"' }),
      name: z.string(),
      quantity: z.string().nullable(),
      unit: z.string().nullable(),
    }),
  ),
  materials: z.array(
    z.object({
      id: z.string().meta({ description: 'Unique id such as "mat1"' }),
      name: z.string(),
      description: z.string().nullable(),
    }),
  ),
  steps: z.array(
    z.object({
      action: z.string(),
      ingredients: z
        .array(z.string())
        .meta({ description: 'Ids of the ingredients used in this step' }),
      materials: z
        .array(z.string())
        .meta({ description: 'Ids of the materials used in this step' }),
    }),
  ),
  tags: z.array(z.string()).meta({ description: 'At most 5 tags' }),
  cookingTime: z
    .string()
    .nullable()
    .meta({ description: 'Total time, e.g. "1 hour 15 minutes"' }),
  servings: z.number().nullable(),
})

export type Extraction = z.infer<typeof ExtractionSchema>

export class NotARecipeError extends Error {
  constructor() {
    super('No recipe was found in this content.')
    this.name = 'NotARecipeError'
  }
}

/** Turns the model output into stored recipe content, dropping step references to unknown ids. */
export function toRecipeContent(
  extraction: Extraction,
  imageUrl: string,
): RecipeContent {
  if (
    !extraction.isRecipe ||
    extraction.ingredients.length + extraction.steps.length === 0
  ) {
    throw new NotARecipeError()
  }

  const ingredients = extraction.ingredients.map((i) => ({
    id: i.id,
    name: i.name,
    ...(i.quantity ? { quantity: i.quantity } : {}),
    ...(i.unit ? { unit: i.unit } : {}),
  }))
  const materials = extraction.materials.map((m) => ({
    id: m.id,
    name: m.name,
    ...(m.description ? { description: m.description } : {}),
  }))
  const ingredientIds = new Set(ingredients.map((i) => i.id))
  const materialIds = new Set(materials.map((m) => m.id))

  return {
    title: extraction.title.trim() || 'Untitled Recipe',
    ingredients,
    materials,
    steps: extraction.steps.map((s) => ({
      action: s.action,
      ingredients: s.ingredients.filter((id) => ingredientIds.has(id)),
      materials: s.materials.filter((id) => materialIds.has(id)),
    })),
    tags: [
      ...new Set(extraction.tags.map((t) => t.trim()).filter(Boolean)),
    ].slice(0, 5),
    imageUrl,
    cookingTime: extraction.cookingTime ?? '',
    servings:
      extraction.servings && extraction.servings > 0
        ? Math.round(extraction.servings)
        : 0,
  }
}
