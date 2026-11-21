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

export interface VideoKeys {
  /** ElevenLabs speech-to-text, for transcripts. */
  elevenlabs: string
  /** YouTube Data API v3, for descriptions: YouTube blocks page scraping from servers. */
  youtube: string
}

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

function youtubeId(url: string): string | undefined {
  const parsed = new URL(url)
  if (host(url) === 'youtu.be') return parsed.pathname.slice(1).split('/')[0]
  return (
    parsed.searchParams.get('v') ??
    parsed.pathname.match(/^\/(?:shorts|live|embed)\/([\w-]{11})/)?.[1]
  )
}

/** The official API: title, channel, full description and the best thumbnail. */
async function youtubeDataApi(
  url: string,
  apiKey: string,
): Promise<VideoMetadata> {
  const id = youtubeId(url)
  if (!id) throw new Error('Not a YouTube video URL')
  const data = await getJson(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${encodeURIComponent(id)}&key=${encodeURIComponent(apiKey)}`,
  )
  const items = data.items as
    | Array<{
        snippet?: {
          title?: string
          description?: string
          channelTitle?: string
          thumbnails?: Record<string, { url?: string } | undefined>
        }
      }>
    | undefined
  const snippet = items?.[0]?.snippet
  if (!snippet) throw new Error('YouTube video not found')
  const thumbnails = snippet.thumbnails ?? {}
  const thumbnail = ['maxres', 'standard', 'high', 'medium', 'default']
    .map((size) => thumbnails[size]?.url)
    .find(Boolean)
  return {
    title: str(snippet.title),
    author: str(snippet.channelTitle),
    description: str(snippet.description),
    thumbnail,
  }
}

/** Without an API key: the description from the page's player data (blocked from datacenter IPs). */
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

async function getMetadata(
  url: string,
  youtubeApiKey: string,
): Promise<VideoMetadata> {
  const site = host(url)
  if (site === 'youtube.com' || site === 'youtu.be') {
    if (youtubeApiKey) return youtubeDataApi(url, youtubeApiKey)
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
  keys: VideoKeys,
): Promise<SourceContent> {
  // Without an ElevenLabs key, only the title and description are used.
  const [metadataResult, transcriptResult] = await Promise.allSettled([
    getMetadata(url, keys.youtube),
    keys.elevenlabs
      ? transcribe(url, keys.elevenlabs)
      : Promise.reject(new Error('ELEVENLABS_API_KEY is not set')),
  ])
  const metadata =
    metadataResult.status === 'fulfilled' ? metadataResult.value : {}
  const transcript =
    transcriptResult.status === 'fulfilled' ? transcriptResult.value : undefined

  // Without a transcript, the description alone may still hold the recipe.
  if (!transcript?.text.trim() && !metadata.description) {
    if (
      transcriptResult.status === 'rejected' ||
      metadataResult.status === 'rejected'
    ) {
      const reasons = [transcriptResult, metadataResult]
        .filter((r) => r.status === 'rejected')
        .map((r) => String(r.reason))
      console.warn('Video import failed', url, reasons)
    }
    throw new Error(
      transcript
        ? "This video has no spoken recipe and its description couldn't be read."
        : "Couldn't read this video: no transcript and no description.",
    )
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
