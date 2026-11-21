import fs from 'node:fs/promises'
import path from 'node:path'
import { config } from './config.server'
import type { SaveImage } from './extraction'

const SAFE_NAME = /^[a-f0-9]{32}\.webp$/

/** Stores processed upload images under DATA_FOLDER/uploads, served by the /uploads/$name route. */
export const saveUploadedImage: SaveImage = async (name, data) => {
  if (!SAFE_NAME.test(name)) throw new Error(`Invalid upload name: ${name}`)
  await fs.mkdir(config.uploadsFolder, { recursive: true })
  await fs.writeFile(path.join(config.uploadsFolder, name), data)
  return `/uploads/${name}`
}

export async function readUploadedImage(name: string): Promise<Buffer | null> {
  if (!SAFE_NAME.test(name)) return null
  try {
    return await fs.readFile(path.join(config.uploadsFolder, name))
  } catch {
    return null
  }
}
