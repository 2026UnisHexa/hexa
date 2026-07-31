import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { handleSuggestChords } from './api/suggest-chords.js'
import { handleTranscribe } from './api/transcribe.js'

/**
 * Local-dev mirror of Vercel /api/* so `npm run dev` works
 * without `vercel dev`. Uses the same handlers; never exposes the API key.
 */
function localDevApis(): Plugin {
  return {
    name: 'hexa-dev-apis',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0]

        if (url === '/api/suggest-chords') {
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
          return
        }

        if (url === '/api/transcribe') {
          void handleTranscribe(req, res).catch((err: unknown) => {
            console.error('[vite transcribe]', err)
            if (!res.headersSent) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(
                JSON.stringify({ error: 'Internal server error in dev API' }),
              )
            }
          })
          return
        }

        next()
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // Merge .env / .env.local into process.env for the Node-only middleware.
  // File values win so a stale shell OPENAI_API_KEY cannot override .env.local.
  // Non-VITE_ keys are never injected into the client bundle by Vite.
  const env = loadEnv(mode, process.cwd(), '')
  for (const [key, value] of Object.entries(env)) {
    process.env[key] = value
  }

  return {
    plugins: [react(), localDevApis()],
  }
})
