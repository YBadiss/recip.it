import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireAdmin, requireUser, withUser } from './middleware'

const RecipeId = z.object({ id: z.string().min(1) })

export const listRecipes = createServerFn({ method: 'GET' })
  .middleware([withUser])
  .handler(async ({ context }) => context.recipes.list(context.user?.id))

export const getRecipe = createServerFn({ method: 'GET' })
  .validator(RecipeId)
  .middleware([withUser])
  .handler(async ({ data, context }) => {
    const recipe = context.recipes.get(data.id, context.user?.id)
    if (!recipe) throw notFound()
    return recipe
  })

// Imports are open to visitors too; signed-in users also get the recipe added to their collection.
export const importRecipeFromUrl = createServerFn({ method: 'POST' })
  .validator(z.object({ url: z.string().trim().min(1, 'Please enter a URL') }))
  .middleware([withUser])
  .handler(async ({ data, context }) => {
    const recipe = await context.recipes.importUrl(data.url, context.user?.id)
    return { id: recipe.id }
  })

export const importRecipeFromFile = createServerFn({ method: 'POST' })
  .validator((data: unknown) => {
    const file = data instanceof FormData ? data.get('file') : null
    if (!(file instanceof File))
      throw new Error('Please choose a file to upload')
    return file
  })
  .middleware([withUser])
  .handler(async ({ data: file, context }) => {
    const recipe = await context.recipes.importFile(
      {
        name: file.name,
        mimeType: file.type,
        bytes: new Uint8Array(await file.arrayBuffer()),
      },
      context.user?.id,
    )
    return { id: recipe.id }
  })

export const addToCollection = createServerFn({ method: 'POST' })
  .validator(RecipeId)
  .middleware([requireUser])
  .handler(async ({ data, context }) => {
    context.recipes.addToCollection(context.user.id, data.id)
    return null
  })

export const removeFromCollection = createServerFn({ method: 'POST' })
  .validator(RecipeId)
  .middleware([requireUser])
  .handler(async ({ data, context }) => {
    context.recipes.removeFromCollection(context.user.id, data.id)
    return null
  })

// Admin

export const listUsers = createServerFn({ method: 'GET' })
  .middleware([requireAdmin])
  .handler(async ({ context }) => context.store.listUsers())

export const reimportRecipe = createServerFn({ method: 'POST' })
  .validator(RecipeId)
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const recipe = await context.recipes.reimport(data.id)
    return { id: recipe.id }
  })

export const deleteRecipe = createServerFn({ method: 'POST' })
  .validator(RecipeId)
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    context.recipes.delete(data.id)
    return null
  })
