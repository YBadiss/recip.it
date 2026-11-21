import { Supadata } from '@supadata/js'
import type { Metadata, Transcript } from '@supadata/js'
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

export function isVideoUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^(www|m)\./, '')
    return VIDEO_HOSTS.includes(host)
  } catch {
    return false
  }
}

const INSTRUCTIONS = `This content is a video transcript plus the video's description.
1. Ingredients and amounts may be mentioned anywhere in the video; collect them all.
2. Cooking times and temperatures may be said casually; capture them.
3. The description often contains the written recipe; use it together with the transcript.
4. Tools may be used without being named; list the obvious ones.
5. The recipe title may be in the video title, the description or the transcript.`

const POLL_INTERVAL_MS = 2_000
const MAX_WAIT_MS = 90_000

async function waitForTranscript(
  supadata: Supadata,
  jobId: string,
): Promise<Transcript> {
  const deadline = Date.now() + MAX_WAIT_MS
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
    const job = await supadata.transcript.getJobStatus(jobId)
    if (job.status === 'completed' && job.result) return job.result
    if (job.status === 'failed')
      throw new Error(job.error?.message ?? 'Transcript job failed')
  }
  throw new Error('Timed out waiting for the video transcript')
}

function thumbnail(metadata: Metadata): string {
  const media = metadata.media
  if (media.type === 'video') return media.thumbnailUrl
  if (media.type === 'image') return media.url
  if (media.type === 'carousel') {
    const first = media.items.at(0)
    if (!first) return ''
    return first.type === 'video' ? first.thumbnailUrl : first.url
  }
  return ''
}

export async function fetchVideo(
  url: string,
  apiKey: string,
): Promise<SourceContent> {
  if (!apiKey)
    throw new Error('SUPADATA_API_KEY is not set: video imports are disabled')
  const supadata = new Supadata({ apiKey })

  const [metadata, transcriptOrJob] = await Promise.all([
    supadata.metadata({ url }),
    // `auto` uses the platform's captions when there are some, and generates a transcript otherwise.
    supadata.transcript({ url, text: true, mode: 'auto' }),
  ])
  const transcript =
    'jobId' in transcriptOrJob
      ? await waitForTranscript(supadata, transcriptOrJob.jobId)
      : transcriptOrJob
  const transcriptText =
    typeof transcript.content === 'string'
      ? transcript.content
      : transcript.content.map((chunk) => chunk.text).join(' ')

  const sections = [`Source URL: ${url}`]
  if (metadata.title) sections.push(`Video title: ${metadata.title}`)
  if (metadata.author.displayName)
    sections.push(`Author: ${metadata.author.displayName}`)
  if (metadata.description)
    sections.push(`# Video description\n${metadata.description}`)
  if (metadata.media.type === 'post')
    sections.push(`# Post text\n${metadata.media.text}`)
  if (transcriptText.trim())
    sections.push(`# Transcript\n${transcriptText.slice(0, 80_000)}`)

  return {
    text: sections.join('\n\n'),
    media: [],
    instructions: INSTRUCTIONS,
    imageUrl: thumbnail(metadata),
  }
}
