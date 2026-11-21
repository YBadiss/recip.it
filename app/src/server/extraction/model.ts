import { randomUUID } from 'node:crypto'
import { chat } from '@tanstack/ai'
import type { AnyTextAdapter, ContentPart } from '@tanstack/ai'
import { anthropicText } from '@tanstack/ai-anthropic'
import { geminiText } from '@tanstack/ai-gemini'
import { openaiText } from '@tanstack/ai-openai'
import { ExtractionSchema } from './schema'
import { SYSTEM_PROMPT } from './prompt'
import type { Extraction } from './schema'
import type { SourceContent } from './types'

/** Turns gathered source content into a structured extraction. Swappable in tests. */
export interface RecipeModel {
  extract: (source: SourceContent) => Promise<Extraction>
}

const PROVIDERS = {
  openai: (model: string) =>
    openaiText(model as Parameters<typeof openaiText>[0]),
  anthropic: (model: string) =>
    anthropicText(model as Parameters<typeof anthropicText>[0]),
  gemini: (model: string) =>
    geminiText(model as Parameters<typeof geminiText>[0]),
} satisfies Record<string, (model: string) => AnyTextAdapter>

const TIMEOUT_MS = 110_000

/**
 * Builds the model from a `<provider>:<model>` spec such as `openai:gpt-5-mini`,
 * `anthropic:claude-haiku-5-5` or `gemini:gemini-3.5-flash`. API keys come from the provider's usual
 * environment variable (OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY).
 */
export function createRecipeModel(spec: string): RecipeModel {
  const [provider, ...rest] = spec.split(':')
  const model = rest.join(':')
  if (!(provider in PROVIDERS) || !model) {
    throw new Error(
      `Invalid LLM_MODEL "${spec}": expected <provider>:<model> with provider in ${Object.keys(PROVIDERS).join(', ')}`,
    )
  }
  const createAdapter = PROVIDERS[provider as keyof typeof PROVIDERS]

  return {
    async extract(source) {
      const content: ContentPart[] = [
        {
          type: 'text',
          content: source.text || 'Extract the recipe from the attached file.',
        },
      ]
      for (const media of source.media) {
        content.push({
          type: media.kind,
          source: {
            type: 'data',
            value: media.base64,
            mimeType: media.mimeType,
          },
        })
      }

      const abortController = new AbortController()
      const timeout = setTimeout(() => abortController.abort(), TIMEOUT_MS)
      try {
        return await chat({
          adapter: createAdapter(model),
          threadId: randomUUID(),
          systemPrompts: [
            SYSTEM_PROMPT,
            ...(source.instructions ? [source.instructions] : []),
          ],
          messages: [{ role: 'user', content }],
          outputSchema: ExtractionSchema,
          abortController,
        })
      } finally {
        clearTimeout(timeout)
      }
    },
  }
}
