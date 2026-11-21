import { createHash } from 'node:crypto'
import heicConvert from 'heic-convert'
import sharp from 'sharp'
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from '#/lib/files'
import type { SourceContent, UploadedFile } from '../types'

type FileKind = 'pdf' | 'heic' | 'image' | 'text'

/** Saves a processed image and returns the URL it is served from. */
export type SaveImage = (name: string, data: Buffer) => Promise<string>

export class UnsupportedFileError extends Error {
  constructor(name: string) {
    super(
      `Unsupported file "${name}". Upload a photo (JPEG, PNG, WebP, HEIC), a PDF or a text file.`,
    )
    this.name = 'UnsupportedFileError'
  }
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.subarray(start, end))
}

/** Detects the file type from its content; browsers often send a wrong or empty type for HEIC. */
export function detectKind(file: UploadedFile): FileKind | undefined {
  const b = file.bytes
  if (ascii(b, 0, 5) === '%PDF-') return 'pdf'
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image'
  if (b[0] === 0x89 && ascii(b, 1, 4) === 'PNG') return 'image'
  if (ascii(b, 0, 4) === 'GIF8') return 'image'
  if (ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WEBP') return 'image'
  if (ascii(b, 4, 8) === 'ftyp') {
    const brand = ascii(b, 8, 12)
    if (brand === 'avif' || brand === 'avis') return 'image'
    if (['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(brand))
      return 'heic'
  }
  const isTextName = /\.(txt|md|markdown)$/i.test(file.name)
  if (file.mimeType.startsWith('text/') || isTextName) {
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(b)
      return 'text'
    } catch {
      return undefined
    }
  }
  return undefined
}

async function processImage(file: UploadedFile, kind: 'heic' | 'image') {
  const input =
    kind === 'heic'
      ? Buffer.from(
          await heicConvert({
            buffer: Buffer.from(file.bytes),
            format: 'JPEG',
            quality: 0.92,
          }),
        )
      : Buffer.from(file.bytes)
  // rotate() applies the EXIF orientation, so phone photos are not sideways.
  const image = sharp(input, { animated: false }).rotate()
  const [forModel, forDisplay] = await Promise.all([
    image
      .clone()
      .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer(),
    image
      .clone()
      .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer(),
  ])
  return { forModel, forDisplay }
}

export interface FileSource {
  /** Stable identity of the file, used to detect re-uploads: `file://upload/<md5>`. */
  link: string
  load: () => Promise<SourceContent>
}

export function readFile(file: UploadedFile, saveImage: SaveImage): FileSource {
  if (file.bytes.byteLength === 0) throw new UnsupportedFileError(file.name)
  if (file.bytes.byteLength > MAX_UPLOAD_BYTES)
    throw new Error(`File too large. Maximum size is ${MAX_UPLOAD_MB} MB.`)
  const kind = detectKind(file)
  if (!kind) throw new UnsupportedFileError(file.name)

  const md5 = createHash('md5').update(file.bytes).digest('hex')
  const context = `Uploaded file: ${file.name}`

  return {
    link: `file://upload/${md5}`,
    async load() {
      switch (kind) {
        case 'pdf':
          return {
            text: `${context}\n\nExtract the recipe from the attached PDF.`,
            media: [
              {
                kind: 'document',
                mimeType: 'application/pdf',
                base64: Buffer.from(file.bytes).toString('base64'),
              },
            ],
            imageUrl: '',
          }
        case 'text':
          return {
            text: `${context}\n\n${new TextDecoder().decode(file.bytes).slice(0, 60_000)}`,
            media: [],
            imageUrl: '',
          }
        case 'heic':
        case 'image': {
          const { forModel, forDisplay } = await processImage(file, kind)
          return {
            text: `${context}\n\nExtract the recipe shown in this photo (a cookbook page, a handwritten card, a screenshot...).`,
            media: [
              {
                kind: 'image',
                mimeType: 'image/jpeg',
                base64: forModel.toString('base64'),
              },
            ],
            imageUrl: await saveImage(`${md5}.webp`, forDisplay),
          }
        }
      }
    },
  }
}
