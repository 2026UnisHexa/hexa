import { useCallback, useState } from 'react'
import type { NoteEventTime } from '@spotify/basic-pitch'
import { audioBlobToNotes } from '../lib/basicPitch'
import type { MelodyNote } from '../types/midi'

export function useBasicPitch() {
  const [notes, setNotes] = useState<MelodyNote[]>([])
  const [progress, setProgress] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const transcribe = useCallback(async (blob: Blob) => {
    setLoading(true)
    setError(null)
    setProgress(0)
    setNotes([])
    try {
      const result: NoteEventTime[] = await audioBlobToNotes(blob, (pct) => {
        setProgress(Math.round(pct * 100))
      })
      const mapped: MelodyNote[] = result.map((n) => ({
        startTimeSeconds: n.startTimeSeconds,
        durationSeconds: n.durationSeconds,
        pitchMidi: n.pitchMidi,
        amplitude: n.amplitude,
      }))
      console.log('[useBasicPitch] notes', mapped)
      setNotes(mapped)
      if (mapped.length === 0) {
        setError(
          '인식된 노트가 없습니다. 단음으로 마이크에 가까이 대고 다시 녹음해 보세요.',
        )
      }
      return mapped
    } catch (err) {
      console.error('[useBasicPitch]', err)
      setError(
        err instanceof Error
          ? err.message
          : '피치 인식에 실패했습니다. 다시 시도해 주세요.',
      )
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  return { notes, setNotes, progress, loading, error, transcribe }
}
