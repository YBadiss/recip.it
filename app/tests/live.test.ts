// Calls the real model and services. Skipped unless RUN_LIVE_TESTS=1 (npm run test:live), and reads
// LLM_MODEL, the provider API key, ELEVENLABS_API_KEY and YOUTUBE_API_KEY from the environment (e.g. app/.env).
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { createRecipeModel } from '#/server/extraction'
import { openDatabase } from '#/server/db.server'
import { RecipeService } from '#/server/recipes.server'
import { Store } from '#/server/store.server'

const live = process.env.RUN_LIVE_TESTS === '1'

describe.skipIf(!live)('live extraction', () => {
  async function service() {
    const uploads = await fs.mkdtemp(path.join(os.tmpdir(), 'recipit-live-'))
    return new RecipeService(new Store(openDatabase(':memory:')), {
      model: createRecipeModel(process.env.LLM_MODEL || 'openai:gpt-5-mini'),
      videoKeys: {
        elevenlabs: process.env.ELEVENLABS_API_KEY || '',
        youtube: process.env.YOUTUBE_API_KEY || '',
      },
      saveImage: async (name, data) => {
        await fs.writeFile(path.join(uploads, name), data)
        return `/uploads/${name}`
      },
    })
  }

  it('imports a recipe website', { timeout: 180_000 }, async () => {
    const recipe = await (
      await service()
    ).importUrl(
      'https://www.marmiton.org/recettes/recette_tarte-aux-pommes_18588.aspx',
    )
    expect(recipe.ingredients.length).toBeGreaterThan(2)
    expect(recipe.steps.length).toBeGreaterThan(2)
    expect(recipe.steps.some((s) => s.ingredients.length > 0)).toBe(true)
  })

  // Uses the transcript when ELEVENLABS_API_KEY is set, the video description alone otherwise.
  it.each([
    'https://www.youtube.com/watch?v=UGsvfsrP2fo',
    'https://www.youtube.com/watch?v=dkIBr4jN54I',
  ])('imports the YouTube video %s', { timeout: 240_000 }, async (url) => {
    const recipe = await (await service()).importUrl(url)
    console.log(JSON.stringify(recipe, null, 2))
    expect(recipe.ingredients.length).toBeGreaterThan(2)
    expect(recipe.steps.length).toBeGreaterThan(2)
    expect(recipe.imageUrl).toMatch(/^https:/)
  })
})
