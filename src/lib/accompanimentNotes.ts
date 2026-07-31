import * as Tone from 'tone'
import type { ChordVoicing } from '../types/chord'
import type { GenrePreset } from '../types/genre'
import type { MelodyNote } from '../types/midi'

export function noteNameToMidi(name: string): number {
  return Math.round(Tone.Frequency(name).toMidi())
}

/**
 * Expand chord progression + genre pattern into timed notes.
 * Timing mirrors `playAccompaniment` in accompaniment.ts:
 * - arpeggio: tones spread across chordDurationSeconds / 4
 * - block / offbeat: simultaneous chord tones (playback treats them the same)
 */
export function buildAccompanimentNotes(
  chords: ChordVoicing[],
  preset: GenrePreset,
  startTimeSeconds = 0,
): MelodyNote[] {
  const notes: MelodyNote[] = []
  const slot = preset.chordDurationSeconds

  chords.forEach((chord, i) => {
    const chordStart = startTimeSeconds + i * slot

    if (preset.pattern === 'arpeggio') {
      const beat = slot / 4
      chord.notes.forEach((name, j) => {
        notes.push({
          startTimeSeconds: chordStart + j * beat,
          durationSeconds: Math.max(0.05, beat * 0.85),
          pitchMidi: noteNameToMidi(name),
          amplitude: 0.7,
        })
      })
      return
    }

    const noteDur = Math.max(0.05, slot * 0.9)
    for (const name of chord.notes) {
      notes.push({
        startTimeSeconds: chordStart,
        durationSeconds: noteDur,
        pitchMidi: noteNameToMidi(name),
        amplitude: 0.65,
      })
    }
  })

  return notes
}

/** Align accompaniment to the melody's first note onset. */
export function melodyAccompanimentStart(melody: MelodyNote[]): number {
  if (melody.length === 0) return 0
  return Math.min(...melody.map((n) => n.startTimeSeconds))
}
