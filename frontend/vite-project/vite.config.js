import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),tailwindcss()],
  server: {
    // Mirrors production, where the `api` service owns /api on the same domain.
    // The prefix is deliberately not rewritten: the backend mounts its routes
    // under /api, exactly as Vercel forwards them.
    proxy: {
      '/api': {
        target: 'http://localhost:3333',
      },
    },
  },
})
