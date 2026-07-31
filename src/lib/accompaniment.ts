import * as Tone from 'tone'
import type { ChordVoicing } from '../types/chord'
import type { GenrePreset } from '../types/genre'
import type { MelodyNote } from '../types/midi'
import { playChordProgression } from './chordPlayback'

async function getMelodySynth(): Promise<Tone.PolySynth> {
  await Tone.start()
  return new Tone.PolySynth(Tone.Synth).toDestination()
}

/** Play melody notes with original startTime/duration timing (not equalized beats). */
export async function playMelody(notes: MelodyNote[]): Promise<void> {
  if (notes.length === 0) return
  console.log('[playMelody] start', { noteCount: notes.length })
  const synth = await getMelodySynth()
  const now = Tone.now()
  const sorted = [...notes].sort(
    (a, b) => a.startTimeSeconds - b.startTimeSeconds,
  )
  const t0 = sorted[0]!.startTimeSeconds

  for (const note of sorted) {
    const freq = Tone.Midi(note.pitchMidi).toFrequency()
    const start = now + (note.startTimeSeconds - t0)
    const dur = Math.max(0.05, note.durationSeconds)
    // Basic Pitch amplitude can be very low; keep audible floor.
    const velocity = Math.min(1, Math.max(0.2, note.amplitude || 0.6))
    synth.triggerAttackRelease(freq, dur, start, velocity)
  }

  const end =
    sorted.reduce(
      (max, n) => Math.max(max, n.startTimeSeconds + n.durationSeconds),
      0,
    ) - t0
  await new Promise((r) => setTimeout(r, end * 1000 + 200))
  synth.dispose()
  console.log('[playMelody] end')
}

/**
 * Play selected chord progression using genre timing/pattern.
 * Arpeggio/offbeat are approximated by spreading chord tones.
 */
export async function playAccompaniment(
  chords: ChordVoicing[],
  preset: GenrePreset,
): Promise<void> {
  if (preset.pattern === 'arpeggio') {
    await Tone.start()
    const synth = new Tone.Synth().toDestination()
    const beat = preset.chordDurationSeconds / 4
    let t = Tone.now()
    for (const chord of chords) {
      for (const note of chord.notes) {
        synth.triggerAttackRelease(note, beat * 0.85, t)
        t += beat
      }
    }
    await new Promise((r) =>
      setTimeout(r, chords.length * preset.chordDurationSeconds * 1000 + 100),
    )
    synth.dispose()
    return
  }

  if (preset.pattern === 'offbeat') {
    await playChordProgression(chords, preset.chordDurationSeconds)
    return
  }

  // block
  await playChordProgression(chords, preset.chordDurationSeconds)
}

/** Melody + accompaniment together (melody offset slightly). */
export async function playMelodyWithAccompaniment(
  notes: MelodyNote[],
  chords: ChordVoicing[],
  preset: GenrePreset,
): Promise<void> {
  await Promise.all([
    playMelody(notes),
    playAccompaniment(chords, preset),
  ])
}
