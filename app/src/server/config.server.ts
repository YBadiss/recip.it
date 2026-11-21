import path from 'node:path'

// Read per call, never at module scope, so values come from the runtime environment.
export const config = {
  get isProduction() {
    return process.env.NODE_ENV === 'production'
  },
  get dataFolder() {
    return path.resolve(process.env.DATA_FOLDER || './data')
  },
  get dbPath() {
    return path.join(this.dataFolder, 'recipes.db')
  },
  get uploadsFolder() {
    return path.join(this.dataFolder, 'uploads')
  },
  get jwtSecret() {
    const secret = process.env.JWT_SECRET
    if (!secret) throw new Error('JWT_SECRET is not set')
    return secret
  },
  get jwtExpiration() {
    return process.env.JWT_EXPIRATION || '30d'
  },
  get cookieName() {
    return process.env.COOKIE_NAME || 'recipeit_token'
  },
  /** `<provider>:<model>`, e.g. `openai:gpt-5-mini`, `anthropic:claude-haiku-5-5`, `gemini:gemini-3.5-flash`. */
  get llmModel() {
    return process.env.LLM_MODEL || 'openai:gpt-5-mini'
  },
  get elevenlabsApiKey() {
    return process.env.ELEVENLABS_API_KEY || ''
  },
}
