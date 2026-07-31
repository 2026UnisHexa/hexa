/**
 * Vercel serverless: OpenAI chord suggestions.
 * API key is read only from process.env.OPENAI_API_KEY (never exposed to the client).
 */

import OpenAI from 'openai'

const MAX_MELODY_SUMMARY_LENGTH = 2000
const MAX_NOTE_COUNT = 24

// 필요시 모델명 변경 가능
const OPENAI_MODEL = 'gpt-4o-mini'

const SYSTEM_PROMPT = `You are a music theory assistant. Given a melody summary and a required chord count N, suggest exactly 3 chord progressions that fit the melody.
Prefer diatonic chords.
코드 진행은 반드시 입력된 노트 개수(N)와 정확히 동일한 길이로 생성할 것. 3개의 후보 모두 코드 개수가 N개로 통일되어야 함.
단순 반복이 아니라 자연스러운 전개(예: 도입-전개-변화-마무리)가 느껴지도록 만들어줘.
반드시 JSON만 출력, 다른 설명 텍스트 없이.
Return a JSON object with this exact shape:
{"suggestions":[{"label":string,"chords":[{"name":string,"notes":string[]}]}]}
Each chords array MUST contain exactly N items.
Each notes array MUST use scientific pitch notation strings with octave, e.g. ["C4","E4","G4"] or ["A3","C4","E4"].
Do NOT use MIDI numbers, unicode accidentals (♭/♯), or chord symbols inside notes — only pitch names like C, D, E, F, G, A, B with optional #/b and an octave digit.`

/**
 * @param {unknown} body
 * @returns {{ ok: true, melodySummary: string, noteCount: number } | { ok: false, status: number, error: string }}
 */
export function validateSuggestChordsBody(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, status: 400, error: 'Request body must be a JSON object' }
  }

  const { melodySummary, noteCount } = /** @type {Record<string, unknown>} */ (
    body
  )

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

  let n = MAX_NOTE_COUNT
  if (typeof noteCount === 'number' && Number.isFinite(noteCount)) {
    n = Math.min(MAX_NOTE_COUNT, Math.max(1, Math.round(noteCount)))
  } else {
    const match = trimmed.match(/noteCount\s+(\d+)/i)
    if (match) {
      n = Math.min(MAX_NOTE_COUNT, Math.max(1, Number(match[1])))
    }
  }

  return { ok: true, melodySummary: trimmed, noteCount: n }
}

/**
 * Truncate if longer; pad with last chord if shorter.
 * @param {unknown[]} chords
 * @param {number} n
 */
function fitChordsToLength(chords, n) {
  if (!Array.isArray(chords) || n <= 0) return []
  const valid = chords.filter(
    (c) =>
      c &&
      typeof c === 'object' &&
      typeof /** @type {{name?: unknown}} */ (c).name === 'string' &&
      Array.isArray(/** @type {{notes?: unknown}} */ (c).notes),
  )
  if (valid.length === 0) return []
  if (valid.length === n) return valid
  if (valid.length > n) return valid.slice(0, n)
  const out = [...valid]
  const last = valid[valid.length - 1]
  while (out.length < n) out.push(last)
  return out
}

/**
 * @param {unknown} suggestions
 * @param {number} noteCount
 */
function normalizeSuggestionsPayload(suggestions, noteCount) {
  if (!Array.isArray(suggestions)) return []
  return suggestions.slice(0, 3).map((s) => {
    if (!s || typeof s !== 'object') return s
    const item = /** @type {{ label?: unknown, chords?: unknown }} */ (s)
    return {
      ...item,
      chords: fitChordsToLength(
        Array.isArray(item.chords) ? item.chords : [],
        noteCount,
      ),
    }
  })
}

/**
 * @param {string} melodySummary
 * @param {number} noteCount
 * @param {string} apiKey
 * @returns {Promise<string>} raw JSON text (array of suggestions) for the frontend parser
 */
export async function callOpenAIForChords(melodySummary, noteCount, apiKey) {
  const n = noteCount
  const userPrompt = `다음은 ${n}개의 음으로 구성된 멜로디입니다. 정확히 ${n}개의 코드로 구성된 진행을 3가지 제안해주세요.
코드 진행은 반드시 입력된 노트 개수(${n})와 정확히 동일한 길이로 생성할 것. 3개의 후보 모두 코드 개수가 ${n}개로 통일되어야 함.

Melody summary:
${melodySummary}

반드시 JSON만 출력, 다른 설명 텍스트 없이. Return {"suggestions":[...]} with exactly 3 items, each with exactly ${n} chords.
Each chord notes MUST be scientific pitch strings with octave, e.g. ["C4","E4","G4"].`

  console.log('[api/suggest-chords] OpenAI prompt', { noteCount: n, melodySummary })

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

  const normalized = normalizeSuggestionsPayload(suggestions, n)
  console.log('[api/suggest-chords] normalized chord lengths', {
    noteCount: n,
    lengths: normalized.map(
      (s) => (s && typeof s === 'object' && Array.isArray(s.chords) ? s.chords.length : 0),
    ),
  })
  return JSON.stringify(normalized)
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

    const raw = await callOpenAIForChords(
      validated.melodySummary,
      validated.noteCount,
      apiKey.trim(),
    )
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
