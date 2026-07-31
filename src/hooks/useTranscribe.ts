import { useCallback, useState } from 'react'
import type { TranscribeResult } from '../types/voice'

function emptyResult(): TranscribeResult {
  return { raw: '', refined: '' }
}

function normalizeResult(data: unknown): TranscribeResult {
  if (!data || typeof data !== 'object') return emptyResult()
  const obj = data as Record<string, unknown>
  const raw = typeof obj.raw === 'string' ? obj.raw : ''
  const refined =
    typeof obj.refined === 'string' && obj.refined.trim()
      ? obj.refined
      : raw
  return { raw, refined }
}

/**
 * POST audio Blob to /api/transcribe (OpenAI Whisper + light cleanup).
 * Never calls OpenAI from the browser; API keys stay server-side.
 * On failure, returns empty strings so the UI does not hard-crash.
 */
export function useTranscribe() {
  const [result, setResult] = useState<TranscribeResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
    setLoading(false)
  }, [])

  const transcribe = useCallback(async (blob: Blob): Promise<TranscribeResult> => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const form = new FormData()
      const ext = blob.type.includes('webm')
        ? 'webm'
        : blob.type.includes('mp4') || blob.type.includes('m4a')
          ? 'm4a'
          : 'wav'
      form.append('audio', blob, `voice-memo.${ext}`)

      const res = await fetch('/api/transcribe', {
        method: 'POST',
        body: form,
      })

      const data: unknown = await res.json().catch(() => null)
      const normalized = normalizeResult(data)
      const serverError =
        data &&
        typeof data === 'object' &&
        typeof (data as { error?: unknown }).error === 'string'
          ? (data as { error: string }).error
          : null

      if (!res.ok && !normalized.raw && !normalized.refined) {
        throw new Error(serverError ?? `API ${res.status}`)
      }

      if (!normalized.raw && !normalized.refined) {
        const message =
          serverError ?? '음성을 텍스트로 바꾸지 못했습니다. 다시 녹음해 주세요.'
        setError(message)
        setResult(normalized)
        return normalized
      }

      if (serverError) {
        console.warn('[useTranscribe] soft error', serverError)
      }

      setResult(normalized)
      console.log('[useTranscribe]', {
        rawLen: normalized.raw.length,
        refinedLen: normalized.refined.length,
      })
      return normalized
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '음성 변환 요청에 실패했습니다.'
      console.warn('[useTranscribe] fallback empty', err)
      setError(message)
      const fallback = emptyResult()
      setResult(fallback)
      return fallback
    } finally {
      setLoading(false)
    }
  }, [])

  return { result, loading, error, transcribe, reset }
}
