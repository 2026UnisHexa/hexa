import type { ChordSuggestion, ChordVoicing } from '../types/chord'
import { FALLBACK_CHORD_SUGGESTIONS } from './chordFallback'

function isChordVoicing(value: unknown): value is ChordVoicing {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.name === 'string' &&
    Array.isArray(v.notes) &&
    v.notes.every((n) => typeof n === 'string')
  )
}

function isChordSuggestion(value: unknown): value is ChordSuggestion {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.label === 'string' &&
    Array.isArray(v.chords) &&
    v.chords.every(isChordVoicing)
  )
}

function extractJsonArray(text: string): unknown {
  const trimmed = text.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const start = trimmed.indexOf('[')
    const end = trimmed.lastIndexOf(']')
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1))
    }
    throw new Error('No JSON array found in response')
  }
}

function withFallback(reason: string): ChordSuggestion[] {
  console.log('[chords] source: fallback', { reason })
  return FALLBACK_CHORD_SUGGESTIONS
}

export function parseChordSuggestions(raw: string): ChordSuggestion[] {
  try {
    const parsed = extractJsonArray(raw)
    if (!Array.isArray(parsed)) {
      throw new Error('Response is not an array')
    }
    const valid = parsed.filter(isChordSuggestion)
    if (valid.length === 0) {
      throw new Error('No valid chord suggestions')
    }
    console.log('[chords] source: openai-api', {
      count: Math.min(valid.length, 3),
      labels: valid.slice(0, 3).map((s) => s.label),
    })
    return valid.slice(0, 3)
  } catch (err) {
    console.warn('[suggest-chords] JSON parse failed, using fallback', err)
    return withFallback('json-parse-failed')
  }
}

/**
 * Ask the backend (/api/suggest-chords) for chord progressions.
 * Never calls OpenAI from the browser; API keys stay server-side.
 * On any failure, returns hardcoded fallback progressions.
 */
export async function suggestChordProgressions(
  melodySummary: string,
): Promise<ChordSuggestion[]> {
  console.log('[chords] request melodySummary', melodySummary)
  try {
    const res = await fetch('/api/suggest-chords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ melodySummary }),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`API ${res.status}: ${text}`)
    }
    const data = (await res.json()) as { raw?: string; suggestions?: unknown }
    if (Array.isArray(data.suggestions)) {
      const valid = data.suggestions.filter(isChordSuggestion)
      if (valid.length > 0) {
        console.log('[chords] source: openai-api', {
          count: Math.min(valid.length, 3),
          labels: valid.slice(0, 3).map((s) => s.label),
        })
        return valid.slice(0, 3)
      }
    }
    if (typeof data.raw === 'string') {
      return parseChordSuggestions(data.raw)
    }
    throw new Error('Unexpected API response shape')
  } catch (err) {
    console.warn('[suggest-chords] request failed, using fallback', err)
    return withFallback(
      err instanceof Error ? err.message : 'request-failed',
    )
  }
}
