import { createFileRoute } from '@tanstack/react-router'
import { readUploadedImage } from '#/server/uploads.server'

export const Route = createFileRoute('/uploads/$name')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const image = await readUploadedImage(params.name)
        if (!image) return new Response('Not found', { status: 404 })
        return new Response(new Uint8Array(image), {
          headers: {
            'Content-Type': 'image/webp',
            // Names are content hashes, so the file never changes.
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        })
      },
    },
  },
})
