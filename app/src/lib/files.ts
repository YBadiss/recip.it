// Upload limits, shared by the file input and the server-side checks.
export const MAX_UPLOAD_MB = 15
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024
export const ACCEPTED_FILE_TYPES =
  'image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,image/avif,.heic,.heif,application/pdf,text/plain,text/markdown,.txt,.md'
