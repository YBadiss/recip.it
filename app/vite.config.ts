import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  build: {
    rollupOptions: {
      // react-bootstrap marks its modules "use client", which only matters for React Server Components.
      onwarn(warning, warn) {
        if (warning.code !== 'MODULE_LEVEL_DIRECTIVE') warn(warning)
      },
    },
  },
  plugins: [
    // sharp ships platform-specific native binaries and heic-convert a WebAssembly decoder: keep them out of
    // the bundle and copy the full packages into .output/server/node_modules.
    nitro({ traceDeps: ['sharp*', 'heic-convert*'] }),
    tanstackStart(),
    viteReact(),
  ],
})
