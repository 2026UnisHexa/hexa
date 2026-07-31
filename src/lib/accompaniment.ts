import * as Tone from 'tone'
import type { ChordVoicing } from '../types/chord'
import type { GenrePreset } from '../types/genre'
import type { MelodyNote } from '../types/midi'
import type { InstrumentId, PlayableInstrument } from './instruments'
import {
  getInstrument,
  midiToNoteName,
  releaseInstrumentNotes,
} from './instruments'
import {
  playChordProgression,
  stopChordPlayback,
} from './chordPlayback'

let activeMelodyInstrumentId: InstrumentId | null = null
let activeArpeggioSynth: Tone.Synth | null = null
const activeTimers = new Set<ReturnType<typeof setTimeout>>()
const pendingResolvers = new Set<() => void>()
let playbackGeneration = 0

function waitForPlayback(ms: number, generation: number): Promise<void> {
  return new Promise((resolve) => {
    if (generation !== playbackGeneration) {
      resolve()
      return
    }

    const finish = () => {
      pendingResolvers.delete(finish)
      resolve()
    }
    pendingResolvers.add(finish)

    const timer = setTimeout(() => {
      activeTimers.delete(timer)
      finish()
    }, ms)
    activeTimers.add(timer)
  })
}

function clearAllTimers(): void {
  for (const timer of activeTimers) {
    clearTimeout(timer)
  }
  activeTimers.clear()
  const resolvers = [...pendingResolvers]
  pendingResolvers.clear()
  for (const resolve of resolvers) {
    resolve()
  }
}

/** Stop melody / accompaniment playback immediately. */
export function stopPlayback(): void {
  console.log('[playback] stop')
  playbackGeneration += 1
  clearAllTimers()

  if (activeMelodyInstrumentId) {
    releaseInstrumentNotes(activeMelodyInstrumentId)
    activeMelodyInstrumentId = null
  }

  if (activeArpeggioSynth) {
    try {
      activeArpeggioSynth.dispose()
    } catch {
      // already disposed
    }
    activeArpeggioSynth = null
  }

  void stopChordPlayback()
}

function scheduleMelodyNotes(
  instrument: PlayableInstrument,
  notes: MelodyNote[],
  generation: number,
): number {
  const sorted = [...notes].sort(
    (a, b) => a.startTimeSeconds - b.startTimeSeconds,
  )
  const t0 = sorted[0]!.startTimeSeconds

  for (const note of sorted) {
    const offsetMs = (note.startTimeSeconds - t0) * 1000
    const dur = Math.max(0.05, note.durationSeconds)
    const velocity = Math.min(1, Math.max(0.2, note.amplitude || 0.6))
    const pitch = midiToNoteName(note.pitchMidi)

    const timer = setTimeout(() => {
      activeTimers.delete(timer)
      if (generation !== playbackGeneration) return
      instrument.triggerAttackRelease(pitch, dur, undefined, velocity)
    }, Math.max(0, offsetMs))
    activeTimers.add(timer)
  }

  return (
    sorted.reduce(
      (max, n) => Math.max(max, n.startTimeSeconds + n.durationSeconds),
      0,
    ) - t0
  )
}

async function playMelodyInternal(
  notes: MelodyNote[],
  generation: number,
  instrumentId: InstrumentId,
): Promise<void> {
  if (notes.length === 0) return
  console.log('[playMelody] start', {
    noteCount: notes.length,
    instrumentId,
  })

  const instrument = await getInstrument(instrumentId)
  if (generation !== playbackGeneration) return

  activeMelodyInstrumentId = instrumentId
  releaseInstrumentNotes(instrumentId)

  const end = scheduleMelodyNotes(instrument, notes, generation)
  await waitForPlayback(end * 1000 + 200, generation)

  if (generation !== playbackGeneration) return
  if (activeMelodyInstrumentId === instrumentId) {
    activeMelodyInstrumentId = null
  }
  console.log('[playMelody] end')
}

/** Play melody notes with original startTime/duration timing (not equalized beats). */
export async function playMelody(
  notes: MelodyNote[],
  instrumentId: InstrumentId = 'piano',
): Promise<void> {
  stopPlayback()
  const generation = playbackGeneration
  await playMelodyInternal(notes, generation, instrumentId)
}

/**
 * Play selected chord progression using genre timing/pattern.
 * Arpeggio/offbeat are approximated by spreading chord tones.
 */
export async function playAccompaniment(
  chords: ChordVoicing[],
  preset: GenrePreset,
): Promise<void> {
  const generation = playbackGeneration

  if (preset.pattern === 'arpeggio') {
    await Tone.start()
    if (generation !== playbackGeneration) return

    const synth = new Tone.Synth().toDestination()
    activeArpeggioSynth = synth
    const beat = preset.chordDurationSeconds / 4
    let t = Tone.now()
    for (const chord of chords) {
      for (const note of chord.notes) {
        synth.triggerAttackRelease(note, beat * 0.85, t)
        t += beat
      }
    }
    await waitForPlayback(
      chords.length * preset.chordDurationSeconds * 1000 + 100,
      generation,
    )
    if (generation !== playbackGeneration) return
    if (activeArpeggioSynth === synth) {
      synth.dispose()
      activeArpeggioSynth = null
    }
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
  instrumentId: InstrumentId = 'piano',
): Promise<void> {
  stopPlayback()
  const generation = playbackGeneration
  await Promise.all([
    playMelodyInternal(notes, generation, instrumentId),
    playAccompaniment(chords, preset),
  ])
}
