/**
 * Vercel serverless: STT text → lyric suggestions.
 * API key is read only from process.env.OPENAI_API_KEY (never exposed to the client).
 */

import OpenAI from 'openai'

const MAX_TEXT_LENGTH = 4000
const OPENAI_MODEL = 'gpt-4o-mini'

const SYSTEM_PROMPT = `You are a songwriting assistant. Given source text and a genre, write exactly 3 song lyric options.
Keep the meaning of the source text; expand it into singable lyrics.
반드시 JSON만 출력, 다른 설명 텍스트 없이.
Return a JSON object with this exact shape:
{"suggestions":[{"title":string,"lyrics":string}]}
Exactly 3 items. lyrics may include newline characters.`

/**
 * @param {unknown} body
 * @returns {{ ok: true, text: string, genre: string } | { ok: false, status: number, error: string }}
 */
export function validateSuggestLyricsBody(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, status: 400, error: 'Request body must be a JSON object' }
  }

  const { text, genre } = /** @type {Record<string, unknown>} */ (body)

  if (typeof text !== 'string') {
    return { ok: false, status: 400, error: 'text must be a string' }
  }

  const trimmed = text.trim()
  if (!trimmed) {
    return { ok: false, status: 400, error: 'text must be a non-empty string' }
  }

  if (trimmed.length > MAX_TEXT_LENGTH) {
    return {
      ok: false,
      status: 400,
      error: `text must be at most ${MAX_TEXT_LENGTH} characters`,
    }
  }

  const genreLabel =
    typeof genre === 'string' && genre.trim() ? genre.trim() : 'pop'

  return { ok: true, text: trimmed, genre: genreLabel }
}

/**
 * Wrap source text into ~4 lines for fallback lyrics.
 * @param {string} text
 */
export function fallbackLyricsFromText(text) {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned) {
    return {
      title: '원본 그대로',
      lyrics: '가사를 만들지 못했습니다.',
    }
  }

  const words = cleaned.split(' ')
  const lines = []
  let current = ''
  const targetLines = 4
  const perLine = Math.max(1, Math.ceil(words.length / targetLines))

  for (const word of words) {
    if (!current) {
      current = word
    } else if (current.split(' ').length >= perLine && lines.length < targetLines - 1) {
      lines.push(current)
      current = word
    } else {
      current = `${current} ${word}`
    }
  }
  if (current) lines.push(current)

  return {
    title: '원본 그대로',
    lyrics: lines.join('\n'),
  }
}

/**
 * @param {unknown} suggestions
 * @param {string} sourceText
 */
function normalizeSuggestionsPayload(suggestions, sourceText) {
  if (!Array.isArray(suggestions)) {
    return [fallbackLyricsFromText(sourceText)]
  }

  const valid = suggestions
    .filter(
      (s) =>
        s &&
        typeof s === 'object' &&
        typeof /** @type {{title?: unknown}} */ (s).title === 'string' &&
        typeof /** @type {{lyrics?: unknown}} */ (s).lyrics === 'string' &&
        /** @type {{title: string}} */ (s).title.trim() &&
        /** @type {{lyrics: string}} */ (s).lyrics.trim(),
    )
    .slice(0, 3)
    .map((s) => {
      const item = /** @type {{ title: string, lyrics: string }} */ (s)
      return {
        title: item.title.trim(),
        lyrics: item.lyrics.trim(),
      }
    })

  if (valid.length === 0) {
    return [fallbackLyricsFromText(sourceText)]
  }

  while (valid.length < 3) {
    valid.push(fallbackLyricsFromText(sourceText))
  }

  return valid.slice(0, 3)
}

/**
 * @param {string} text
 * @param {string} genre
 * @param {string} apiKey
 * @returns {Promise<string>} raw JSON array string for the frontend parser
 */
export async function callOpenAIForLyrics(text, genre, apiKey) {
  const userPrompt = `다음 텍스트를 바탕으로 노래 가사를 써줘. 장르: ${genre}. 원본 텍스트: ${text}.
반드시 JSON 배열만 출력하고 다른 설명 텍스트는 붙이지 마.
Return {"suggestions":[{"title":string,"lyrics":string}]} with exactly 3 items.`

  console.log('[api/suggest-lyrics] OpenAI prompt', {
    genre,
    textLength: text.length,
  })

  const client = new OpenAI({ apiKey })
  const completion = await client.chat.completions.create({
    model: OPENAI_MODEL,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
  })

  const content = completion.choices[0]?.message?.content
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('OpenAI API returned empty content')
  }

  let parsed
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error('OpenAI API returned invalid JSON')
  }

  let suggestions
  if (Array.isArray(parsed)) {
    suggestions = parsed
  } else if (
    parsed &&
    typeof parsed === 'object' &&
    Array.isArray(parsed.suggestions)
  ) {
    suggestions = parsed.suggestions
  } else {
    throw new Error('OpenAI JSON missing suggestions array')
  }

  const normalized = normalizeSuggestionsPayload(suggestions, text)
  return JSON.stringify(normalized)
}

/**
 * @param {import('http').IncomingMessage & { body?: unknown }} req
 * @returns {Promise<unknown>}
 */
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => {
      chunks.push(chunk)
      const size = chunks.reduce((n, c) => n + c.length, 0)
      if (size > 64_000) {
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

/**
 * Shared request handler for Vercel and Vite local middleware.
 * @param {import('http').IncomingMessage & { body?: unknown }} req
 * @param {import('http').ServerResponse} res
 */
export async function handleSuggestLyrics(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')

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
      body = req.body !== undefined ? req.body : await readJsonBody(req)
    } catch (parseErr) {
      const message =
        parseErr instanceof Error ? parseErr.message : 'Invalid request body'
      res.statusCode = 400
      res.end(JSON.stringify({ error: message }))
      return
    }

    const validated = validateSuggestLyricsBody(body)
    if (!validated.ok) {
      res.statusCode = validated.status
      res.end(JSON.stringify({ error: validated.error }))
      return
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
      // Soft fallback so the UI never hard-stops.
      const fallback = [fallbackLyricsFromText(validated.text)]
      res.statusCode = 200
      res.end(JSON.stringify({ raw: JSON.stringify(fallback) }))
      return
    }

    try {
      const raw = await callOpenAIForLyrics(
        validated.text,
        validated.genre,
        apiKey.trim(),
      )
      res.statusCode = 200
      res.end(JSON.stringify({ raw }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error('[api/suggest-lyrics] openai fallback', message)
      const fallback = [fallbackLyricsFromText(validated.text)]
      res.statusCode = 200
      res.end(JSON.stringify({ raw: JSON.stringify(fallback) }))
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown server error'
    console.error('[api/suggest-lyrics]', message)
    res.statusCode = 500
    res.end(
      JSON.stringify({
        error: `Failed to suggest lyrics: ${message}`,
      }),
    )
  }
}

export default async function handler(req, res) {
  await handleSuggestLyrics(req, res)
}
