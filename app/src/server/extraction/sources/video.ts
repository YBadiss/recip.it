import * as cheerio from 'cheerio'
import { fetchPage } from './fetch'
import type { SourceContent } from '../types'

const VIDEO_HOSTS = [
  'youtube.com',
  'youtu.be',
  'tiktok.com',
  'vm.tiktok.com',
  'instagram.com',
  'x.com',
  'twitter.com',
]

function host(url: string): string {
  return new URL(url).hostname.toLowerCase().replace(/^(www|m)\./, '')
}

export function isVideoUrl(url: string): boolean {
  try {
    return VIDEO_HOSTS.includes(host(url))
  } catch {
    return false
  }
}

const INSTRUCTIONS = `This content is a video transcript plus the video's title and description.
1. Ingredients and amounts may be mentioned anywhere in the video; collect them all.
2. Cooking times and temperatures may be said casually; capture them.
3. The description often contains the written recipe; use it together with the transcript.
4. Tools may be used without being named; list the obvious ones.
5. The recipe title may be in the video title, the description or the transcript.
6. Write every field of the recipe (title, ingredients, steps, tags) in the language of the video, as shown by its title, description and transcript, even though these instructions are in English. Do not translate.`

interface VideoMetadata {
  title?: string
  author?: string
  description?: string
  thumbnail?: string
}

// Metadata

async function getJson(url: string): Promise<Record<string, unknown>> {
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return (await response.json()) as Record<string, unknown>
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

/** oEmbed gives title, author and thumbnail for YouTube and TikTok; TikTok's title is the caption. */
async function oembed(url: string): Promise<VideoMetadata> {
  const endpoint = host(url).includes('tiktok')
    ? 'https://www.tiktok.com/oembed'
    : 'https://www.youtube.com/oembed'
  const data = await getJson(
    `${endpoint}?format=json&url=${encodeURIComponent(url)}`,
  )
  return {
    title: str(data.title),
    author: str(data.author_name),
    thumbnail: str(data.thumbnail_url),
  }
}

/** The full YouTube description is only in the page's embedded player data. */
async function youtubeDescription(url: string): Promise<string | undefined> {
  // The consent cookie skips the EU cookie wall, which otherwise replaces the page.
  const { html } = await fetchPage(url, { Cookie: 'SOCS=CAI' })
  const match = html.match(/"shortDescription":("(?:[^"\\]|\\.)*")/)
  return match ? str(JSON.parse(match[1])) : undefined
}

/** Other sites (Instagram, X): the page's Open Graph tags carry the caption and a thumbnail. */
async function openGraph(url: string): Promise<VideoMetadata> {
  const { html } = await fetchPage(url)
  const $ = cheerio.load(html)
  const meta = (name: string) =>
    str($(`meta[property="${name}"]`).attr('content')) ??
    str($(`meta[name="${name}"]`).attr('content'))
  return {
    title: meta('og:title'),
    description: meta('og:description') ?? meta('description'),
    thumbnail: meta('og:image'),
  }
}

async function getMetadata(url: string): Promise<VideoMetadata> {
  const site = host(url)
  if (site === 'youtube.com' || site === 'youtu.be') {
    const [info, description] = await Promise.allSettled([
      oembed(url),
      youtubeDescription(url),
    ])
    return {
      ...(info.status === 'fulfilled' ? info.value : {}),
      description:
        description.status === 'fulfilled' ? description.value : undefined,
    }
  }
  if (site.includes('tiktok')) {
    const info = await oembed(url)
    // The caption is the recipe text on TikTok.
    return { ...info, description: info.title }
  }
  return openGraph(url)
}

// Transcript

const ELEVENLABS_URL = 'https://api.elevenlabs.io/v1/speech-to-text'

interface Transcript {
  text: string
  language: string
}

/** ElevenLabs Scribe downloads the video itself from its URL (YouTube, TikTok and other hosts). */
async function transcribe(url: string, apiKey: string): Promise<Transcript> {
  const body = new FormData()
  body.append('model_id', 'scribe_v2')
  body.append('source_url', url)
  body.append('tag_audio_events', 'false')

  const response = await fetch(ELEVENLABS_URL, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey },
    body,
    signal: AbortSignal.timeout(180_000),
  })
  if (response.status === 202)
    throw new Error('The transcription was queued instead of returned')
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(
      `ElevenLabs answered HTTP ${response.status}: ${detail.slice(0, 300)}`,
    )
  }
  const data = (await response.json()) as {
    text?: string
    language_code?: string
  }
  return { text: data.text ?? '', language: data.language_code ?? '' }
}

export async function fetchVideo(
  url: string,
  apiKey: string,
): Promise<SourceContent> {
  // Without an ElevenLabs key, only the title and description are used.
  const [metadataResult, transcriptResult] = await Promise.allSettled([
    getMetadata(url),
    apiKey
      ? transcribe(url, apiKey)
      : Promise.reject(new Error('ELEVENLABS_API_KEY is not set')),
  ])
  const metadata =
    metadataResult.status === 'fulfilled' ? metadataResult.value : {}
  const transcript =
    transcriptResult.status === 'fulfilled' ? transcriptResult.value : undefined

  // Without a transcript, the description alone may still hold the recipe.
  if (!transcript?.text.trim() && !metadata.description) {
    const reason =
      transcriptResult.status === 'rejected'
        ? String(transcriptResult.reason)
        : 'empty transcript'
    throw new Error(`Could not read this video (${reason})`)
  }

  const sections = [`Source URL: ${url}`]
  if (metadata.title) sections.push(`Video title: ${metadata.title}`)
  if (metadata.author) sections.push(`Author: ${metadata.author}`)
  if (metadata.description)
    sections.push(`# Video description\n${metadata.description}`)
  if (transcript?.text.trim()) {
    const language = transcript.language
      ? ` (language: ${transcript.language})`
      : ''
    sections.push(
      `# Transcript${language}\n${transcript.text.slice(0, 80_000)}`,
    )
  }

  return {
    text: sections.join('\n\n'),
    media: [],
    instructions: INSTRUCTIONS,
    imageUrl: metadata.thumbnail ?? '',
  }
}
