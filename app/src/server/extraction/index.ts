// Recipe extraction: gathers content from a URL or an uploaded file and asks the model for a structured
// recipe. Plain TypeScript with no framework imports, so it can run anywhere (server function, job, CLI).
import { toRecipeContent } from './schema'
import { fetchVideo, isVideoUrl } from './sources/video'
import { fetchWebPage } from './sources/web'
import { readFile } from './sources/file'
import type { RecipeModel } from './model'
import type { SaveImage } from './sources/file'
import type { SourceContent, UploadedFile } from './types'
import type { RecipeContent } from '#/lib/recipe'

export { createRecipeModel } from './model'
export type { RecipeModel } from './model'
export { NotARecipeError } from './schema'
export { UnsupportedFileError } from './sources/file'
export type { SaveImage } from './sources/file'
export type { UploadedFile } from './types'

export interface ExtractionDeps {
  model: RecipeModel
  elevenlabsApiKey: string
  saveImage: SaveImage
}

async function extract(
  source: SourceContent,
  model: RecipeModel,
): Promise<RecipeContent> {
  return toRecipeContent(await model.extract(source), source.imageUrl)
}

export async function extractFromUrl(
  url: string,
  deps: ExtractionDeps,
): Promise<RecipeContent> {
  const source = isVideoUrl(url)
    ? await fetchVideo(url, deps.elevenlabsApiKey)
    : await fetchWebPage(url)
  return extract(source, deps.model)
}

/** Validates the file right away (type, size) and returns its link plus a function that extracts it. */
export function prepareFile(file: UploadedFile, deps: ExtractionDeps) {
  const source = readFile(file, deps.saveImage)
  return {
    link: source.link,
    extract: async () => extract(await source.load(), deps.model),
  }
}
