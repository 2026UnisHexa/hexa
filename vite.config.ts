import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { handleSuggestChords } from './api/suggest-chords.js'

/**
 * Local-dev mirror of Vercel /api/suggest-chords so `npm run dev` works
 * without `vercel dev`. Uses the same handler; never exposes the API key.
 */
function suggestChordsDevApi(): Plugin {
  return {
    name: 'suggest-chords-dev-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0]
        if (url !== '/api/suggest-chords') {
          next()
          return
        }

        void handleSuggestChords(req, res).catch((err: unknown) => {
          console.error('[vite suggest-chords]', err)
          if (!res.headersSent) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(
              JSON.stringify({ error: 'Internal server error in dev API' }),
            )
          }
        })
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // Merge .env / .env.local into process.env for the Node-only middleware.
  // Non-VITE_ keys are never injected into the client bundle by Vite.
  const env = loadEnv(mode, process.cwd(), '')
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }

  return {
    plugins: [react(), suggestChordsDevApi()],
  }
})
