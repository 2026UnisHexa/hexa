import { useCallback, useRef, useState } from 'react'
import {
  playMelody,
  playMelodyWithAccompaniment,
  stopPlayback,
} from '../lib/accompaniment'
import {
  playChordProgression,
  stopChordPlayback,
} from '../lib/chordPlayback'
import type { ChordVoicing } from '../types/chord'
import type { GenrePreset } from '../types/genre'
import type { MelodyNote } from '../types/midi'

export function usePlayback() {
  const [playing, setPlaying] = useState(false)
  const generationRef = useRef(0)

  const stop = useCallback(() => {
    generationRef.current += 1
    stopPlayback()
    setPlaying(false)
  }, [])

  const playNotes = useCallback(async (notes: MelodyNote[]) => {
    const gen = ++generationRef.current
    setPlaying(true)
    try {
      await playMelody(notes)
    } finally {
      if (gen === generationRef.current) setPlaying(false)
    }
  }, [])

  const playWithAccompaniment = useCallback(
    async (
      notes: MelodyNote[],
      chords: ChordVoicing[],
      preset: GenrePreset,
    ) => {
      const gen = ++generationRef.current
      setPlaying(true)
      try {
        await playMelodyWithAccompaniment(notes, chords, preset)
      } finally {
        if (gen === generationRef.current) setPlaying(false)
      }
    },
    [],
  )

  const toggleMelody = useCallback(
    (notes: MelodyNote[]) => {
      if (playing) {
        stop()
        return
      }
      void playNotes(notes)
    },
    [playing, playNotes, stop],
  )

  const toggleWithAccompaniment = useCallback(
    (
      notes: MelodyNote[],
      chords: ChordVoicing[],
      preset: GenrePreset,
    ) => {
      if (playing) {
        stop()
        return
      }
      void playWithAccompaniment(notes, chords, preset)
    },
    [playing, playWithAccompaniment, stop],
  )

  return {
    playing,
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
      // Stop any in-flight progression before starting a new one.
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
