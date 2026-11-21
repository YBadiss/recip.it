import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { setup } from './helpers'

async function photo(): Promise<Uint8Array> {
  // A portrait photo stored sideways with an EXIF orientation, as phones do.
  return new Uint8Array(
    await sharp({
      create: { width: 3000, height: 2000, channels: 3, background: '#c0a080' },
    })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer(),
  )
}

const pdf = new TextEncoder().encode(
  '%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF',
)

describe('importing a recipe from a file', () => {
  it('sends photos to the model with instructions and keeps them as the recipe image', async () => {
    const { service, sources, uploads } = await setup()
    // The browser reports no type: detection relies on the file content.
    const bytes = await photo()
    const recipe = await service.importFile({
      name: 'IMG_0001.jpg',
      mimeType: '',
      bytes,
    })

    const [source] = sources
    expect(source.text).toContain('Extract the recipe shown in this photo')
    expect(source.media).toHaveLength(1)
    expect(source.media[0].kind).toBe('image')
    expect(source.media[0].mimeType).toBe('image/jpeg')
    const sent = await sharp(
      Buffer.from(source.media[0].base64, 'base64'),
    ).metadata()
    expect([sent.width, sent.height]).toEqual([1365, 2048]) // rotated upright, resized to fit 2048

    expect(recipe.link).toMatch(/^file:\/\/upload\/[a-f0-9]{32}$/)
    expect(recipe.imageUrl).toMatch(/^\/uploads\/[a-f0-9]{32}\.webp$/)
    const stored = await sharp(
      await fs.readFile(path.join(uploads, path.basename(recipe.imageUrl))),
    ).metadata()
    expect(stored.format).toBe('webp')

    // Uploading the same file again reuses the recipe.
    const again = await service.importFile({
      name: 'copy.jpg',
      mimeType: 'image/jpeg',
      bytes,
    })
    expect(again.id).toBe(recipe.id)
    expect(sources).toHaveLength(1)
  })

  it('sends PDFs as documents and reads text files, and rejects other files', async () => {
    const { service, sources } = await setup()

    await service.importFile({
      name: 'tarte.pdf',
      mimeType: 'application/pdf',
      bytes: pdf,
    })
    expect(sources[0].media).toEqual([
      {
        kind: 'document',
        mimeType: 'application/pdf',
        base64: Buffer.from(pdf).toString('base64'),
      },
    ])

    await service.importFile({
      name: 'tarte.md',
      mimeType: '',
      bytes: new TextEncoder().encode('# Tarte\n4 pommes'),
    })
    expect(sources[1].text).toContain('# Tarte\n4 pommes')
    expect(sources[1].media).toEqual([])

    const zip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0])
    await expect(
      service.importFile({
        name: 'recipe.docx',
        mimeType: 'application/zip',
        bytes: zip,
      }),
    ).rejects.toThrow(/Unsupported file/)
    expect(sources).toHaveLength(2)
  })
})
