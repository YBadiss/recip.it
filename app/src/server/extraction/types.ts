export interface MediaInput {
  kind: 'image' | 'document'
  mimeType: string
  /** Raw base64, without a data: prefix. */
  base64: string
}

/** Content gathered from a source (web page, video, file), ready to send to the model. */
export interface SourceContent {
  /** Text for the model: page text, JSON-LD, transcript, plain-text file... May be empty for media. */
  text: string
  /** Images and PDFs sent to the model as native content parts. */
  media: MediaInput[]
  /** Source-specific instructions appended to the system prompt. */
  instructions?: string
  /** Image to show for the recipe (remote URL or a stored upload). */
  imageUrl: string
}

/** A file uploaded by a user. */
export interface UploadedFile {
  name: string
  mimeType: string
  bytes: Uint8Array
}
