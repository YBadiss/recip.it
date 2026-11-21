import { afterEach, describe, expect, it, vi } from 'vitest'
import { sampleExtraction, setup } from './helpers'

vi.mock('node:dns/promises', () => ({
  lookup: async () => [{ address: '93.184.215.14', family: 4 }],
}))

const page = `<!doctype html><html><head>
  <title>Tarte aux pommes - Cuisine</title>
  <meta property="og:image" content="https://cdn.example.com/og.jpg">
  <script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', name: 'Recettes' },
      {
        '@type': ['Recipe'],
        name: 'Tarte aux pommes',
        image: [{ '@type': 'ImageObject', url: '/img/tarte.jpg' }],
        recipeIngredient: ['4 pommes', '50 g de sucre'],
        recipeInstructions: [
          { '@type': 'HowToStep', text: 'Éplucher les pommes.' },
        ],
      },
    ],
  })}</script>
</head><body><nav>Menu</nav><main>Une tarte facile. Astuce : ajoutez de la cannelle.</main></body></html>`

function stubFetch() {
  const fetchMock = vi.fn(
    async () =>
      new Response(page, { headers: { 'content-type': 'text/html' } }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => vi.unstubAllGlobals())

describe('importing a recipe from a URL', () => {
  it('extracts once per normalized link, from the JSON-LD, and adds it to the collection', async () => {
    const fetchMock = stubFetch()
    const { service, store, sources } = await setup()
    const user = store.createUser('alice', 'hash')

    const recipe = await service.importUrl(
      'https://www.example.com/tarte/?utm_source=x',
      user.id,
    )
    const again = await service.importUrl(
      'https://example.com/tarte',
      undefined,
    )

    expect(again.id).toBe(recipe.id)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(sources).toHaveLength(1)

    // The model gets the structured data plus page text, not the navigation.
    expect(sources[0].text).toContain(
      '"recipeIngredient":["4 pommes","50 g de sucre"]',
    )
    expect(sources[0].text).toContain('ajoutez de la cannelle')
    expect(sources[0].text).not.toContain('Menu')

    expect(recipe).toMatchObject({
      link: 'https://example.com/tarte',
      title: 'Tarte aux pommes',
      imageUrl: 'https://example.com/img/tarte.jpg',
      tags: ['dessert', 'française'],
      servings: 6,
      cookingTime: '45 minutes',
    })
    expect(recipe.steps[0].ingredients).toEqual(['ing1'])
    expect(recipe.ingredients[0]).toEqual({
      id: 'ing1',
      name: 'pommes',
      quantity: '4',
    })

    expect(service.get(recipe.id, user.id)?.inUserList).toBe(true)
    expect(service.list().map((r) => r.id)).toEqual([recipe.id])
  })

  it('refuses private addresses and content without a recipe', async () => {
    stubFetch()
    await expect(
      (await setup()).service.importUrl('http://127.0.0.1:3000/admin'),
    ).rejects.toThrow(/private address/)
    await expect(
      (await setup()).service.importUrl('not a url'),
    ).rejects.toThrow(/valid http/)

    const { service, store } = await setup({
      ...sampleExtraction,
      isRecipe: false,
    })
    await expect(
      service.importUrl('https://example.com/about'),
    ).rejects.toThrow(/No recipe/)
    expect(store.listRecipes()).toHaveLength(0)
  })
})
