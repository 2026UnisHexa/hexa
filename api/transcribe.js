/**
 * Vercel serverless: speech → text (Whisper) + light cleanup.
 * API key is read only from process.env.OPENAI_API_KEY (never exposed to the client).
 */

import OpenAI, { toFile } from 'openai'

const OPENAI_CHAT_MODEL = 'gpt-4o-mini'
const WHISPER_MODEL = 'whisper-1'
const MAX_AUDIO_BYTES = 25 * 1024 * 1024

const REFINE_SYSTEM_PROMPT = `너는 음성 인식 결과를 다듬는 교정기다.
삑사리, 말 더듬음, 반복어만 자연스럽게 정리해줘. 내용/의미는 바꾸지 마.
다른 설명 없이 다듬은 텍스트만 출력해.`

/**
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<Buffer>}
 */
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    /** @type {Buffer[]} */
    const chunks = []
    req.on('data', (chunk) => {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      chunks.push(buf)
      const size = chunks.reduce((n, c) => n + c.length, 0)
      if (size > MAX_AUDIO_BYTES) {
        reject(new Error('Audio file too large (max 25MB)'))
        req.destroy()
      }
    })
    req.on('end', () => {
      resolve(chunks.length === 0 ? Buffer.alloc(0) : Buffer.concat(chunks))
    })
    req.on('error', reject)
  })
}

/**
 * Parse multipart FormData and return the audio File.
 * @param {import('http').IncomingMessage} req
 * @param {Buffer} body
 * @returns {Promise<File>}
 */
async function extractAudioFile(req, body) {
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) continue
    headers.set(key, Array.isArray(value) ? value.join(', ') : String(value))
  }

  const request = new Request('http://localhost/api/transcribe', {
    method: 'POST',
    headers,
    body,
    duplex: 'half',
  })

  const form = await request.formData()
  const entry = form.get('audio') ?? form.get('file')
  if (!entry || typeof entry === 'string') {
    throw new Error('FormData must include an audio file field named "audio"')
  }
  return /** @type {File} */ (entry)
}

/**
 * @param {File} file
 * @param {string} apiKey
 * @returns {Promise<string>}
 */
export async function callWhisper(file, apiKey) {
  const client = new OpenAI({ apiKey })
  const buffer = Buffer.from(await file.arrayBuffer())
  const filename =
    typeof file.name === 'string' && file.name.trim()
      ? file.name
      : 'recording.webm'

  const upload = await toFile(buffer, filename, {
    type: file.type || 'audio/webm',
  })

  const result = await client.audio.transcriptions.create({
    file: upload,
    model: WHISPER_MODEL,
  })

  const text = typeof result.text === 'string' ? result.text.trim() : ''
  if (!text) {
    throw new Error('Whisper returned empty text')
  }
  return text
}

/**
 * @param {string} raw
 * @param {string} apiKey
 * @returns {Promise<string>}
 */
export async function refineTranscript(raw, apiKey) {
  const client = new OpenAI({ apiKey })
  const completion = await client.chat.completions.create({
    model: OPENAI_CHAT_MODEL,
    messages: [
      { role: 'system', content: REFINE_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `다음 음성 인식 결과를 다듬어 주세요:\n\n${raw}`,
      },
    ],
  })

  const text = completion.choices[0]?.message?.content
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('Refine step returned empty content')
  }
  return text.trim()
}

/**
 * Shared request handler for Vercel and Vite local middleware.
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
export async function handleTranscribe(req, res) {
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

  const key = apiKey.trim()

  try {
    const body = await readRawBody(req)
    if (body.length === 0) {
      res.statusCode = 400
      res.end(JSON.stringify({ error: 'Empty request body' }))
      return
    }

    let file
    try {
      file = await extractAudioFile(req, body)
    } catch (parseErr) {
      const message =
        parseErr instanceof Error ? parseErr.message : 'Invalid FormData'
      res.statusCode = 400
      res.end(JSON.stringify({ error: message }))
      return
    }

    let raw = ''
    try {
      raw = await callWhisper(file, key)
    } catch (whisperErr) {
      const message =
        whisperErr instanceof Error ? whisperErr.message : 'Whisper failed'
      console.error('[api/transcribe] whisper', message)
      // Defensive: never blank-crash the client — return empty strings.
      res.statusCode = 200
      res.end(JSON.stringify({ raw: '', refined: '', error: message }))
      return
    }

    let refined = raw
    try {
      refined = await refineTranscript(raw, key)
    } catch (refineErr) {
      const message =
        refineErr instanceof Error ? refineErr.message : 'Refine failed'
      console.warn('[api/transcribe] refine fallback to raw', message)
      refined = raw
    }

    res.statusCode = 200
    res.end(JSON.stringify({ raw, refined }))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown server error'
    console.error('[api/transcribe]', message)
    // Still prefer a soft 200 shape so the UI can keep going.
    res.statusCode = 200
    res.end(
      JSON.stringify({
        raw: '',
        refined: '',
        error: `Failed to transcribe: ${message}`,
      }),
    )
  }
}

// Disable Vercel body parser so we can read multipart FormData ourselves.
export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req, res) {
  await handleTranscribe(req, res)
}
