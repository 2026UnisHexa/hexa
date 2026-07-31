/**
 * Vercel serverless: Claude chord suggestions.
 * API key is read only from process.env.ANTHROPIC_API_KEY (never exposed to the client).
 */

const MAX_MELODY_SUMMARY_LENGTH = 2000

const SYSTEM_PROMPT = `You are a music theory assistant. Given a melody summary, suggest exactly 3 chord progressions that fit it.
Prefer diatonic chords. Respond with JSON array ONLY — no markdown, no explanation, no other text.
Each item must be: {"label": string, "chords": [{"name": string, "notes": string[]}]}
Example: [{"label":"안정적인 팝 진행","chords":[{"name":"C","notes":["C4","E4","G4"]},{"name":"Am","notes":["A3","C4","E4"]},{"name":"F","notes":["F3","A3","C4"]},{"name":"G","notes":["G3","B3","D4"]}]}]`

/**
 * @param {unknown} body
 * @returns {{ ok: true, melodySummary: string } | { ok: false, status: number, error: string }}
 */
export function validateSuggestChordsBody(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, status: 400, error: 'Request body must be a JSON object' }
  }

  const { melodySummary } = /** @type {Record<string, unknown>} */ (body)

  if (typeof melodySummary !== 'string') {
    return {
      ok: false,
      status: 400,
      error: 'melodySummary must be a string',
    }
  }

  const trimmed = melodySummary.trim()
  if (!trimmed) {
    return {
      ok: false,
      status: 400,
      error: 'melodySummary must be a non-empty string',
    }
  }

  if (trimmed.length > MAX_MELODY_SUMMARY_LENGTH) {
    return {
      ok: false,
      status: 400,
      error: `melodySummary must be at most ${MAX_MELODY_SUMMARY_LENGTH} characters`,
    }
  }

  return { ok: true, melodySummary: trimmed }
}

/**
 * @param {string} melodySummary
 * @param {string} apiKey
 * @returns {Promise<string>} raw Claude text (expected JSON array)
 */
export async function callClaudeForChords(melodySummary, apiKey) {
  const userPrompt = `Melody summary:\n${melodySummary}\n\n반드시 JSON만 출력, 다른 설명 텍스트 없이.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const detail =
      payload && typeof payload === 'object' && 'error' in payload
        ? JSON.stringify(payload.error)
        : `HTTP ${response.status}`
    throw new Error(`Claude API error: ${detail}`)
  }

  const text =
    payload &&
    typeof payload === 'object' &&
    Array.isArray(payload.content) &&
    payload.content[0] &&
    payload.content[0].type === 'text'
      ? payload.content[0].text
      : null

  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('Claude API returned empty content')
  }

  return text
}

/**
 * Shared request handler for Vercel and Vite local middleware.
 * @param {import('http').IncomingMessage & { body?: unknown }} req
 * @param {import('http').ServerResponse} res
 */
export async function handleSuggestChords(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  // Same-origin only: do not set Access-Control-Allow-Origin

  if (req.method === 'OPTIONS') {
    res.statusCode = 405
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  if (req.method !== 'POST') {
    res.statusCode = 405
    res.end(JSON.stringify({ error: 'Method not allowed. Use POST.' }))
    return
  }

  try {
    let body
    try {
      body =
        req.body !== undefined ? req.body : await readJsonBody(req)
    } catch (parseErr) {
      const message =
        parseErr instanceof Error ? parseErr.message : 'Invalid request body'
      res.statusCode = 400
      res.end(JSON.stringify({ error: message }))
      return
    }

    const validated = validateSuggestChordsBody(body)
    if (!validated.ok) {
      res.statusCode = validated.status
      res.end(JSON.stringify({ error: validated.error }))
      return
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
      res.statusCode = 500
      res.end(
        JSON.stringify({
          error:
            'Server misconfiguration: ANTHROPIC_API_KEY is not set',
        }),
      )
      return
    }

    const raw = await callClaudeForChords(validated.melodySummary, apiKey.trim())
    res.statusCode = 200
    res.end(JSON.stringify({ raw }))
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unknown server error'
    console.error('[api/suggest-chords]', message)
    res.statusCode = 500
    res.end(
      JSON.stringify({
        error: `Failed to suggest chords: ${message}`,
      }),
    )
  }
}

/**
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<unknown>}
 */
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => {
      chunks.push(chunk)
      const size = chunks.reduce((n, c) => n + c.length, 0)
      if (size > 32_768) {
        reject(new Error('Request body too large'))
        req.destroy()
      }
    })
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({})
        return
      }
      try {
        const raw = Buffer.concat(chunks).toString('utf8')
        resolve(JSON.parse(raw))
      } catch {
        reject(new Error('Invalid JSON body'))
      }
    })
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  // Vercel may already parse JSON into req.body
  await handleSuggestChords(req, res)
}
