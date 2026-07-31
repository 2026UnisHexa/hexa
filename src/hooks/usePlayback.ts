import { useCallback, useEffect, useRef, useState } from 'react'
import {
  playMelody,
  playMelodyWithAccompaniment,
  stopPlayback,
} from '../lib/accompaniment'
import {
  playChordProgression,
  stopChordPlayback,
} from '../lib/chordPlayback'
import {
  getInstrument,
  isInstrumentReady,
  type InstrumentId,
} from '../lib/instruments'
import type { ChordVoicing } from '../types/chord'
import type { GenrePreset } from '../types/genre'
import type { MelodyNote } from '../types/midi'

export function useInstrument(instrumentId: InstrumentId) {
  const [isLoading, setIsLoading] = useState(
    () => !isInstrumentReady(instrumentId),
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (isInstrumentReady(instrumentId)) {
      setIsLoading(false)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)
    void getInstrument(instrumentId)
      .then(() => {
        if (!cancelled) setIsLoading(false)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setIsLoading(false)
          setError(err instanceof Error ? err.message : 'Instrument load failed')
        }
      })

    return () => {
      cancelled = true
    }
  }, [instrumentId])

  return { isLoading, error }
}

export type PlaybackMode = 'idle' | 'melody' | 'accompaniment'

export function usePlayback(instrumentId: InstrumentId = 'piano') {
  const [mode, setMode] = useState<PlaybackMode>('idle')
  const generationRef = useRef(0)
  const instrumentIdRef = useRef(instrumentId)
  instrumentIdRef.current = instrumentId

  const playing = mode !== 'idle'

  const stop = useCallback(() => {
    generationRef.current += 1
    stopPlayback()
    setMode('idle')
  }, [])

  const playNotes = useCallback(async (notes: MelodyNote[]) => {
    const gen = ++generationRef.current
    setMode('melody')
    try {
      await playMelody(notes, instrumentIdRef.current)
    } finally {
      if (gen === generationRef.current) setMode('idle')
    }
  }, [])

  const playWithAccompaniment = useCallback(
    async (
      notes: MelodyNote[],
      chords: ChordVoicing[],
      preset: GenrePreset,
    ) => {
      const gen = ++generationRef.current
      setMode('accompaniment')
      try {
        await playMelodyWithAccompaniment(
          notes,
          chords,
          preset,
          instrumentIdRef.current,
        )
      } finally {
        if (gen === generationRef.current) setMode('idle')
      }
    },
    [],
  )

  const toggleMelody = useCallback(
    (notes: MelodyNote[]) => {
      if (mode === 'melody') {
        stop()
        return
      }
      if (mode === 'accompaniment') {
        stop()
      }
      void playNotes(notes)
    },
    [mode, playNotes, stop],
  )

  const toggleWithAccompaniment = useCallback(
    (
      notes: MelodyNote[],
      chords: ChordVoicing[],
      preset: GenrePreset,
    ) => {
      if (mode === 'accompaniment') {
        stop()
        return
      }
      if (mode === 'melody') {
        stop()
      }
      void playWithAccompaniment(notes, chords, preset)
    },
    [mode, playWithAccompaniment, stop],
  )

  return {
    playing,
    mode,
    playNotes,
    playWithAccompaniment,
    stop,
    toggleMelody,
    toggleWithAccompaniment,
  }
}

export function useChordPlayback() {
  const [playing, setPlaying] = useState(false)
  const generationRef = useRef(0)

  const stop = useCallback(() => {
    generationRef.current += 1
    void stopChordPlayback()
    setPlaying(false)
  }, [])

  const play = useCallback(
    async (chords: ChordVoicing[], duration = 0.8) => {
      const gen = ++generationRef.current
      await stopChordPlayback()
      if (gen !== generationRef.current) return
      setPlaying(true)
      try {
        await playChordProgression(chords, duration)
      } finally {
        if (gen === generationRef.current) setPlaying(false)
      }
    },
    [],
  )

  const toggle = useCallback(
    (chords: ChordVoicing[], duration = 0.8) => {
      if (playing) {
        stop()
        return
      }
      void play(chords, duration)
    },
    [playing, play, stop],
  )

  return { playing, play, stop, toggle }
}
