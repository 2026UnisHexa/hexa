import { useCallback, useState } from 'react'
import { playMelody, playMelodyWithAccompaniment } from '../lib/accompaniment'
import { playChordProgression } from '../lib/chordPlayback'
import type { ChordVoicing } from '../types/chord'
import type { GenrePreset } from '../types/genre'
import type { MelodyNote } from '../types/midi'

export function usePlayback() {
  const [playing, setPlaying] = useState(false)

  const playNotes = useCallback(async (notes: MelodyNote[]) => {
    setPlaying(true)
    try {
      await playMelody(notes)
    } finally {
      setPlaying(false)
    }
  }, [])

  const playWithAccompaniment = useCallback(
    async (
      notes: MelodyNote[],
      chords: ChordVoicing[],
      preset: GenrePreset,
    ) => {
      setPlaying(true)
      try {
        await playMelodyWithAccompaniment(notes, chords, preset)
      } finally {
        setPlaying(false)
      }
    },
    [],
  )

  return { playing, playNotes, playWithAccompaniment }
}

export function useChordPlayback() {
  const [playing, setPlaying] = useState(false)

  const play = useCallback(
    async (chords: ChordVoicing[], duration = 0.8) => {
      setPlaying(true)
      try {
        await playChordProgression(chords, duration)
      } finally {
        setPlaying(false)
      }
    },
    [],
  )

  return { playing, play }
}
