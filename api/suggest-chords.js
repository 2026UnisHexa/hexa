/**
 * Vercel serverless: OpenAI chord suggestions.
 * API key is read only from process.env.OPENAI_API_KEY (never exposed to the client).
 */

import OpenAI from 'openai'

const MAX_MELODY_SUMMARY_LENGTH = 2000

// 필요시 모델명 변경 가능
const OPENAI_MODEL = 'gpt-4o-mini'

const SYSTEM_PROMPT = `You are a music theory assistant. Given a melody summary, suggest exactly 3 chord progressions that fit it.
Prefer diatonic chords.
8~16마디 분량의 코드 진행을 3개 제안해줘. 각 진행은 최소 8개 코드로 구성하고, 단순 반복이 아니라 자연스러운 전개(예: 도입-전개-변화-마무리)가 느껴지도록 만들어줘.
반드시 JSON만 출력, 다른 설명 텍스트 없이.
Return a JSON object with this exact shape:
{"suggestions":[{"label":string,"chords":[{"name":string,"notes":string[]}]}]}
Example: {"suggestions":[{"label":"안정적인 팝 진행","chords":[{"name":"C","notes":["C4","E4","G4"]},{"name":"Am","notes":["A3","C4","E4"]},{"name":"F","notes":["F3","A3","C4"]},{"name":"G","notes":["G3","B3","D4"]},{"name":"Am","notes":["A3","C4","E4"]},{"name":"F","notes":["F3","A3","C4"]},{"name":"C","notes":["C4","E4","G4"]},{"name":"G","notes":["G3","B3","D4"]}]}]}`

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
 * @returns {Promise<string>} raw JSON text (array of suggestions) for the frontend parser
 */
export async function callOpenAIForChords(melodySummary, apiKey) {
  const userPrompt = `Melody summary:\n${melodySummary}\n\n8~16마디 분량의 코드 진행을 3개 제안해줘. 각 진행은 최소 8개 코드로 구성하고, 단순 반복이 아니라 자연스러운 전개(예: 도입-전개-변화-마무리)가 느껴지도록 만들어줘.\n반드시 JSON만 출력, 다른 설명 텍스트 없이. Return {"suggestions":[...]} with exactly 3 items.`

  console.log('[api/suggest-chords] OpenAI user prompt melodySummary:', melodySummary)

  const client = new OpenAI({ apiKey })

  const completion = await client.chat.completions.create({
    model: OPENAI_MODEL,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
  })

  const text = completion.choices[0]?.message?.content
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('OpenAI API returned empty content')
  }

  // json_object forces a root object; normalize to a JSON array string for the client.
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('OpenAI API returned invalid JSON')
  }

  if (Array.isArray(parsed)) {
    return JSON.stringify(parsed)
  }

  if (
    parsed &&
    typeof parsed === 'object' &&
    Array.isArray(parsed.suggestions)
  ) {
    return JSON.stringify(parsed.suggestions)
  }

  throw new Error('OpenAI JSON missing suggestions array')
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

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
      res.statusCode = 500
      res.end(
        JSON.stringify({
          error: 'Server misconfiguration: OPENAI_API_KEY is not set',
        }),
      )
      return
    }

    const raw = await callOpenAIForChords(validated.melodySummary, apiKey.trim())
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
