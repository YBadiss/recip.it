import { extractFromUrl, prepareFile } from './extraction'
import { isFileLink } from '#/lib/recipe'
import { isHttpUrl, normalizeUrl } from '#/lib/url'
import type { ExtractionDeps, UploadedFile } from './extraction'
import type { Store } from './store.server'
import type { Recipe, RecipeContent, RecipeWithOwnership } from '#/lib/recipe'

export class RecipeService {
  constructor(
    private readonly store: Store,
    private readonly extraction: ExtractionDeps,
  ) {}

  list(userId?: string): RecipeWithOwnership[] {
    const owned = userId ? this.store.userRecipeIds(userId) : new Set<string>()
    return this.store
      .listRecipes()
      .map((recipe) => ({ ...recipe, inUserList: owned.has(recipe.id) }))
  }

  get(id: string, userId?: string): RecipeWithOwnership | null {
    const recipe = this.store.getRecipe(id)
    if (!recipe) return null
    return {
      ...recipe,
      inUserList: !!userId && this.store.userHasRecipe(userId, id),
    }
  }

  async importUrl(url: string, userId?: string): Promise<Recipe> {
    if (!isHttpUrl(url)) throw new Error('Please enter a valid http(s) URL')
    const link = normalizeUrl(url)
    return this.importOnce(
      link,
      () => extractFromUrl(link, this.extraction),
      userId,
    )
  }

  async importFile(file: UploadedFile, userId?: string): Promise<Recipe> {
    const prepared = prepareFile(file, this.extraction)
    return this.importOnce(prepared.link, prepared.extract, userId)
  }

  /** Runs extraction again from the original URL and replaces the stored content. */
  async reimport(id: string): Promise<Recipe> {
    const recipe = this.store.getRecipe(id)
    if (!recipe) throw new Error('Recipe not found')
    if (isFileLink(recipe.link))
      throw new Error('Recipes imported from a file cannot be reimported')
    const content = await extractFromUrl(recipe.link, this.extraction)
    return this.store.updateRecipe(id, {
      ...content,
      imageUrl: content.imageUrl || recipe.imageUrl,
    })
  }

  addToCollection(userId: string, recipeId: string): void {
    if (!this.store.getRecipe(recipeId)) throw new Error('Recipe not found')
    this.store.addToCollection(userId, recipeId)
  }

  removeFromCollection(userId: string, recipeId: string): void {
    this.store.removeFromCollection(userId, recipeId)
  }

  delete(id: string): void {
    this.store.deleteRecipe(id)
  }

  // A recipe is extracted once per link; later imports of the same link reuse it.
  private async importOnce(
    link: string,
    extract: () => Promise<RecipeContent>,
    userId?: string,
  ): Promise<Recipe> {
    const recipe =
      this.store.getRecipeByLink(link) ??
      this.store.createRecipe(link, await extract())
    if (userId) this.store.addToCollection(userId, recipe.id)
    return recipe
  }
}
