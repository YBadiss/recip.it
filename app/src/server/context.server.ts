import { config } from './config.server'
import { getDb } from './db.server'
import { createRecipeModel } from './extraction'
import { RecipeService } from './recipes.server'
import { Store } from './store.server'
import { saveUploadedImage } from './uploads.server'

let services: { store: Store; recipes: RecipeService } | undefined

/** Lazily wires the app's services on first use (on the server, at request time). */
export function getServices() {
  if (!services) {
    const store = new Store(getDb())
    const recipes = new RecipeService(store, {
      model: createRecipeModel(config.llmModel),
      videoKeys: {
        elevenlabs: config.elevenlabsApiKey,
        youtube: config.youtubeApiKey,
      },
      saveImage: saveUploadedImage,
    })
    services = { store, recipes }
  }
  return services
}
