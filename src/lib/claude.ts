import type { ChordSuggestion, ChordVoicing } from '../types/chord'
import {
  fitChordsToLength,
  getFallbackChordSuggestions,
} from './chordFallback'
import { MAX_SUMMARY_NOTES } from '../utils/melodySummary'
import { sanitizeChordNotes } from './noteSanitize'

function isChordVoicing(value: unknown): value is ChordVoicing {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  const name = typeof v.name === 'string' ? v.name : typeof v.chord === 'string' ? v.chord : null
  const notes = Array.isArray(v.notes)
    ? v.notes
    : Array.isArray(v.pitches)
      ? v.pitches
      : null
  if (!name || !notes) return false
  return sanitizeChordNotes(notes).length > 0
}

function toChordVoicing(value: unknown): ChordVoicing | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  const name =
    typeof v.name === 'string'
      ? v.name
      : typeof v.chord === 'string'
        ? v.chord
        : null
  const notes = Array.isArray(v.notes)
    ? v.notes
    : Array.isArray(v.pitches)
      ? v.pitches
      : null
  if (!name || !notes) return null
  const sanitized = sanitizeChordNotes(notes)
  if (sanitized.length === 0) return null
  return { name, notes: sanitized }
}

function isChordSuggestion(value: unknown): value is ChordSuggestion {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  // Accept if at least one chord is playable — OpenAI often slips one bad
  // voicing into an otherwise valid progression; don't discard the whole set.
  return (
    typeof v.label === 'string' &&
    Array.isArray(v.chords) &&
    v.chords.some(isChordVoicing)
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

function normalizeSuggestions(
  suggestions: ChordSuggestion[],
  noteCount: number,
): ChordSuggestion[] {
  const n = Math.min(Math.max(noteCount, 1), MAX_SUMMARY_NOTES)
  return suggestions
    .slice(0, 3)
    .map((s) => {
      const chords = s.chords
        .map(toChordVoicing)
        .filter((c): c is ChordVoicing => c != null)
      return {
        label: s.label,
        chords: fitChordsToLength(chords, n),
      }
    })
    .filter((s) => s.chords.length > 0)
}

function withFallback(reason: string, noteCount: number): ChordSuggestion[] {
  const n = Math.min(Math.max(noteCount, 1), MAX_SUMMARY_NOTES)
  console.log('[chords] source: fallback', { reason, noteCount: n })
  return getFallbackChordSuggestions(n)
}

export function parseChordSuggestions(
  raw: string,
  noteCount: number,
): ChordSuggestion[] {
  try {
    const parsed = extractJsonArray(raw)
    if (!Array.isArray(parsed)) {
      throw new Error('Response is not an array')
    }
    const valid = parsed.filter(isChordSuggestion)
    if (valid.length === 0) {
      const sample = parsed[0]
      console.warn('[suggest-chords] rejected payload sample', sample)
      throw new Error('No valid chord suggestions')
    }
    const normalized = normalizeSuggestions(valid, noteCount)
    if (normalized.length === 0) {
      throw new Error('No valid chord suggestions after normalize')
    }
    console.log('[chords] source: openai-api', {
      count: normalized.length,
      noteCount,
      chordLengths: normalized.map((s) => s.chords.length),
      labels: normalized.map((s) => s.label),
    })
    return normalized
  } catch (err) {
    console.warn('[suggest-chords] parse/validate failed, using fallback', err)
    return withFallback('json-parse-failed', noteCount)
  }
}

/**
 * Ask the backend (/api/suggest-chords) for chord progressions.
 * Never calls OpenAI from the browser; API keys stay server-side.
 * On any failure, returns hardcoded fallback progressions of length noteCount.
 */
export async function suggestChordProgressions(
  melodySummary: string,
  noteCount: number,
): Promise<ChordSuggestion[]> {
  const n = Math.min(Math.max(noteCount, 1), MAX_SUMMARY_NOTES)
  console.log('[chords] request', { melodySummary, noteCount: n })
  try {
    const res = await fetch('/api/suggest-chords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ melodySummary, noteCount: n }),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`API ${res.status}: ${text}`)
    }
    const data = (await res.json()) as { raw?: string; suggestions?: unknown }
    if (Array.isArray(data.suggestions)) {
      const valid = data.suggestions.filter(isChordSuggestion)
      if (valid.length > 0) {
        const normalized = normalizeSuggestions(valid, n)
        if (normalized.length > 0) {
          console.log('[chords] source: openai-api', {
            count: normalized.length,
            noteCount: n,
            chordLengths: normalized.map((s) => s.chords.length),
            labels: normalized.map((s) => s.label),
          })
          return normalized
        }
      }
    }
    if (typeof data.raw === 'string') {
      return parseChordSuggestions(data.raw, n)
    }
    throw new Error('Unexpected API response shape')
  } catch (err) {
    console.warn('[suggest-chords] request failed, using fallback', err)
    return withFallback(
      err instanceof Error ? err.message : 'request-failed',
      n,
    )
  }
}
