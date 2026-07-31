import { useCallback, useState } from 'react'
import type { LyricsSuggestion } from '../types/lyrics'
import { getFallbackLyricsSuggestions } from '../lib/lyricsFallback'

function isLyricsSuggestion(value: unknown): value is LyricsSuggestion {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.title === 'string' &&
    v.title.trim().length > 0 &&
    typeof v.lyrics === 'string' &&
    v.lyrics.trim().length > 0
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

function parseLyricsSuggestions(
  raw: string,
  sourceText: string,
): LyricsSuggestion[] {
  try {
    const parsed = extractJsonArray(raw)
    if (!Array.isArray(parsed)) {
      throw new Error('Response is not an array')
    }
    const valid = parsed.filter(isLyricsSuggestion).slice(0, 3)
    if (valid.length === 0) {
      throw new Error('No valid lyric suggestions')
    }
    return valid.map((s) => ({
      title: s.title.trim(),
      lyrics: s.lyrics.trim(),
    }))
  } catch (err) {
    console.warn('[suggest-lyrics] JSON parse failed, using fallback', err)
    return getFallbackLyricsSuggestions(sourceText)
  }
}

/**
 * Ask /api/suggest-lyrics for lyric options.
 * Never calls OpenAI from the browser; API keys stay server-side.
 */
export function useLyricsSuggestion() {
  const [suggestions, setSuggestions] = useState<LyricsSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setSuggestions([])
    setError(null)
    setLoading(false)
  }, [])

  const suggest = useCallback(
    async (text: string, genre: string): Promise<LyricsSuggestion[]> => {
      const trimmed = text.trim()
      setLoading(true)
      setError(null)
      setSuggestions([])

      if (!trimmed) {
        const empty = getFallbackLyricsSuggestions('')
        setSuggestions(empty)
        setError('가사로 만들 텍스트가 없습니다.')
        setLoading(false)
        return empty
      }

      try {
        const res = await fetch('/api/suggest-lyrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: trimmed, genre }),
        })

        if (!res.ok) {
          const bodyText = await res.text()
          throw new Error(`API ${res.status}: ${bodyText}`)
        }

        const data = (await res.json()) as {
          raw?: string
          suggestions?: unknown
        }

        let next: LyricsSuggestion[]
        if (Array.isArray(data.suggestions)) {
          const valid = data.suggestions.filter(isLyricsSuggestion)
          next =
            valid.length > 0
              ? valid.slice(0, 3)
              : getFallbackLyricsSuggestions(trimmed)
        } else if (typeof data.raw === 'string') {
          next = parseLyricsSuggestions(data.raw, trimmed)
        } else {
          throw new Error('Unexpected API response shape')
        }

        console.log('[useLyricsSuggestion]', {
          count: next.length,
          titles: next.map((s) => s.title),
        })
        setSuggestions(next)
        return next
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '가사 제안 요청에 실패했습니다.'
        console.warn('[useLyricsSuggestion] fallback', err)
        setError(message)
        const fallback = getFallbackLyricsSuggestions(trimmed)
        setSuggestions(fallback)
        return fallback
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  return { suggestions, loading, error, suggest, reset }
}
