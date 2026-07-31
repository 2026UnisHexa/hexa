import { useCallback, useState } from 'react'
import type { NoteEventTime } from '@spotify/basic-pitch'
import { audioBlobToNotes } from '../lib/basicPitch'
import {
  correctMelodyToKey,
  formatKeyLabel,
  type DetectedKey,
} from '../lib/keyCorrection'
import { mergeShortNotes } from '../lib/mergeNotes'
import type { MelodyNote } from '../types/midi'

export type PitchCorrectionInfo = {
  key: DetectedKey | null
  keyLabel: string
  snappedCount: number
  removedCount: number
  mergedFrom: number
  mergedTo: number
}

export type TranscribeResult = {
  notes: MelodyNote[]
  correction: PitchCorrectionInfo | null
}

export function useBasicPitch() {
  const [notes, setNotes] = useState<MelodyNote[]>([])
  const [progress, setProgress] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [correction, setCorrection] = useState<PitchCorrectionInfo | null>(null)

  const transcribe = useCallback(async (blob: Blob): Promise<TranscribeResult> => {
    setLoading(true)
    setError(null)
    setProgress(0)
    setNotes([])
    setCorrection(null)
    try {
      const result: NoteEventTime[] = await audioBlobToNotes(blob, (pct) => {
        setProgress(Math.round(pct * 100))
      })
      const mapped: MelodyNote[] = result
        .filter(
          (n) =>
            Number.isFinite(n.pitchMidi) &&
            n.pitchMidi >= 12 &&
            n.pitchMidi <= 108 &&
            Number.isFinite(n.startTimeSeconds) &&
            Number.isFinite(n.durationSeconds),
        )
        .map((n) => ({
          startTimeSeconds: n.startTimeSeconds,
          durationSeconds: Math.max(0.05, n.durationSeconds),
          pitchMidi: Math.round(n.pitchMidi),
          amplitude: Number.isFinite(n.amplitude) ? n.amplitude : 0.6,
        }))

      const merged = mergeShortNotes(mapped)
      const corrected = correctMelodyToKey(merged.notes)
      const info: PitchCorrectionInfo = {
        key: corrected.key,
        keyLabel: formatKeyLabel(corrected.key),
        snappedCount: corrected.snappedCount,
        removedCount: corrected.removedCount,
        mergedFrom: merged.before,
        mergedTo: merged.after,
      }

      console.log('[useBasicPitch] notes', {
        raw: mapped.length,
        merged: merged.after,
        corrected: corrected.notes.length,
        ...info,
      })

      setCorrection(info)
      setNotes(corrected.notes)
      if (corrected.notes.length === 0) {
        setError(
          '인식된 노트가 없습니다. 단음으로 마이크에 가까이 대고 다시 녹음해 보세요.',
        )
      }
      return { notes: corrected.notes, correction: info }
    } catch (err) {
      console.error('[useBasicPitch]', err)
      setError(
        err instanceof Error
          ? err.message
          : '피치 인식에 실패했습니다. 다시 시도해 주세요.',
      )
      return { notes: [], correction: null }
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    notes,
    setNotes,
    progress,
    loading,
    error,
    correction,
    transcribe,
  }
}
