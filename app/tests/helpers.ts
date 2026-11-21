import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { openDatabase } from '#/server/db.server'
import { RecipeService } from '#/server/recipes.server'
import { Store } from '#/server/store.server'
import type { Extraction } from '#/server/extraction/schema'
import type { SourceContent } from '#/server/extraction/types'

export const sampleExtraction: Extraction = {
  isRecipe: true,
  title: 'Tarte aux pommes',
  ingredients: [
    { id: 'ing1', name: 'pommes', quantity: '4', unit: null },
    { id: 'ing2', name: 'sucre', quantity: '50', unit: 'g' },
  ],
  materials: [{ id: 'mat1', name: 'moule à tarte', description: null }],
  steps: [
    // "ing9" does not exist and must be dropped.
    {
      action: 'Éplucher les pommes.',
      ingredients: ['ing1', 'ing9'],
      materials: [],
    },
    {
      action: 'Cuire 30 minutes à 180 °C.',
      ingredients: ['ing2'],
      materials: ['mat1'],
    },
  ],
  tags: ['dessert', 'française', 'dessert'],
  cookingTime: '45 minutes',
  servings: 6,
}

/** A RecipeService on an in-memory database, with a fake model that records what it was sent. */
export async function setup(extraction: Extraction = sampleExtraction) {
  const uploads = await fs.mkdtemp(path.join(os.tmpdir(), 'recipit-test-'))
  const sources: SourceContent[] = []
  const store = new Store(openDatabase(':memory:'))
  const service = new RecipeService(store, {
    model: {
      extract: async (source) => {
        sources.push(source)
        return extraction
      },
    },
    elevenlabsApiKey: '',
    saveImage: async (name, data) => {
      await fs.writeFile(path.join(uploads, name), data)
      return `/uploads/${name}`
    },
  })
  return { store, service, sources, uploads }
}
