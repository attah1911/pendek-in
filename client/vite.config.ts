import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Dev mirrors prod: the app always calls /api/*, which is proxied to the API server.
// Locally that's this proxy; on Vercel it's the rewrite in vercel.json. Either way the
// browser only ever talks to one origin, so there's no CORS and the auth cookie is first-party.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
