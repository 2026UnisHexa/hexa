import type { ChordVoicing } from '../types/chord'
import type { GenrePreset } from '../types/genre'
import type { MelodyNote } from '../types/midi'
import { noteNameToMidi, midiToSafeNoteName } from './noteSanitize'

/** Prefer mid-low register so chords sit under the hummed melody. */
export function toAccompanimentRegister(midi: number): number {
  let m = Math.round(midi)
  while (m > 64) m -= 12 // above E4 → down
  while (m < 48) m += 12 // below C3 → up
  return m
}

export function melodySpanSeconds(melody: MelodyNote[]): number {
  if (melody.length === 0) return 4
  const starts = melody.map((n) => n.startTimeSeconds)
  const t0 = Math.min(...starts)
  const end = Math.max(
    ...melody.map((n) => n.startTimeSeconds + n.durationSeconds),
  )
  return Math.max(1.2, end - t0)
}

/** Stretch/compress chord slots to fit the melody length. */
export function chordSlotSeconds(
  chordCount: number,
  preset: GenrePreset,
  melodyDurationSeconds: number,
): number {
  if (chordCount <= 0) return preset.chordDurationSeconds
  const fitted = melodyDurationSeconds / chordCount
  const min = 0.4
  const max = Math.max(preset.chordDurationSeconds * 1.35, 1.4)
  return Math.min(max, Math.max(min, fitted))
}

/**
 * Expand chord progression + genre pattern into timed notes.
 * When melodyDurationSeconds is provided, slots follow the melody length.
 */
export function buildAccompanimentNotes(
  chords: ChordVoicing[],
  preset: GenrePreset,
  startTimeSeconds = 0,
  melodyDurationSeconds?: number,
): MelodyNote[] {
  const notes: MelodyNote[] = []
  const span =
    melodyDurationSeconds ?? chords.length * preset.chordDurationSeconds
  const slot = chordSlotSeconds(chords.length, preset, span)
  const softAmp = 0.32

  chords.forEach((chord, i) => {
    const chordStart =
      startTimeSeconds +
      i * slot +
      (preset.pattern === 'offbeat' ? slot * 0.45 : 0)

    if (preset.pattern === 'arpeggio') {
      const playableMidi = chord.notes
        .map((name) => noteNameToMidi(name))
        .filter((m): m is number => m != null)
        .map(toAccompanimentRegister)
      const beat = slot / Math.max(2, playableMidi.length)
      playableMidi.forEach((midi, j) => {
        notes.push({
          startTimeSeconds: startTimeSeconds + i * slot + j * beat,
          durationSeconds: Math.max(0.05, beat * 0.9),
          pitchMidi: midi,
          amplitude: softAmp,
        })
      })
      return
    }

    const noteDur = Math.max(0.08, slot * (preset.pattern === 'offbeat' ? 0.5 : 0.85))
    for (const name of chord.notes) {
      const midi = noteNameToMidi(name)
      if (midi == null) continue
      notes.push({
        startTimeSeconds: chordStart,
        durationSeconds: noteDur,
        pitchMidi: toAccompanimentRegister(midi),
        amplitude: softAmp,
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

export function accompanimentNoteNames(notes: string[]): string[] {
  const out: string[] = []
  for (const name of notes) {
    const midi = noteNameToMidi(name)
    if (midi == null) continue
    const shifted = midiToSafeNoteName(toAccompanimentRegister(midi))
    if (shifted) out.push(shifted)
  }
  return out
}
