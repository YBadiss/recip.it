import { createFileRoute, notFound } from '@tanstack/react-router'

// Anything that matches no route is a 404 (recipe URL shortcuts are handled in src/start.ts).
export const Route = createFileRoute('/$')({
  beforeLoad: () => {
    throw notFound()
  },
})
