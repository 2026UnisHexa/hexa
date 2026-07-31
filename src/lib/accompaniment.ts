import type { ChordVoicing } from '../types/chord'
import type { GenrePreset } from '../types/genre'
import type { MelodyNote } from '../types/midi'
import type { InstrumentId, PlayableInstrument } from './instruments'
import { getInstrument, releaseInstrumentNotes } from './instruments'
import { midiToSafeNoteName } from './noteSanitize'
import { stopChordPlayback } from './chordPlayback'
import {
  accompanimentNoteNames,
  buildAccompanimentNotes,
  chordSlotSeconds,
  melodySpanSeconds,
} from './accompanimentNotes'

let activeMelodyInstrumentId: InstrumentId | null = null
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

  void stopChordPlayback()
}

function scheduleMelodyNotes(
  instrument: PlayableInstrument,
  notes: MelodyNote[],
  generation: number,
  velocityScale = 1,
): number {
  const sorted = [...notes]
    .filter((n) => midiToSafeNoteName(n.pitchMidi) != null)
    .sort((a, b) => a.startTimeSeconds - b.startTimeSeconds)

  if (sorted.length === 0) return 0

  const t0 = sorted[0]!.startTimeSeconds

  for (const note of sorted) {
    const pitch = midiToSafeNoteName(note.pitchMidi)
    if (!pitch) continue

    const offsetMs = (note.startTimeSeconds - t0) * 1000
    const dur = Math.max(
      0.05,
      Number.isFinite(note.durationSeconds) ? note.durationSeconds : 0.2,
    )
    const velocity =
      Math.min(
        1,
        Math.max(
          0.12,
          (Number.isFinite(note.amplitude) ? note.amplitude || 0.6 : 0.6) *
            velocityScale,
        ),
      )

    const timer = setTimeout(() => {
      activeTimers.delete(timer)
      if (generation !== playbackGeneration) return
      try {
        instrument.triggerAttackRelease(pitch, dur, undefined, velocity)
      } catch (err) {
        console.warn('[playMelody] trigger failed', { pitch, err })
      }
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
  // Only clear this instrument when starting melody-only; with accompaniment
  // we still clear once at the start of the combined play.
  releaseInstrumentNotes(instrumentId)

  const end = scheduleMelodyNotes(instrument, notes, generation, 1)
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
 * Schedule accompaniment on the same sampler as the melody.
 * Timing follows the melody length; velocity stays soft so chords sit under.
 */
async function playAccompanimentInternal(
  chords: ChordVoicing[],
  preset: GenrePreset,
  generation: number,
  instrumentId: InstrumentId,
  melodyNotes: MelodyNote[],
): Promise<void> {
  if (chords.length === 0) return

  const instrument = await getInstrument(instrumentId)
  if (generation !== playbackGeneration) return

  const span = melodySpanSeconds(melodyNotes)
  const slot = chordSlotSeconds(chords.length, preset, span)
  const accNotes = buildAccompanimentNotes(chords, preset, 0, span)

  console.log('[playAccompaniment]', {
    pattern: preset.pattern,
    instrumentId,
    chordCount: chords.length,
    slot: Number(slot.toFixed(3)),
    melodySpan: Number(span.toFixed(3)),
    scheduledNotes: accNotes.length,
  })

  // Soft bed under melody — do NOT releaseInstrumentNotes here (would kill melody).
  scheduleMelodyNotes(instrument, accNotes, generation, 0.55)

  await waitForPlayback(span * 1000 + 250, generation)
}

/** Chord-only preview (step 3) — soft piano pad fitted to preset duration. */
export async function playAccompaniment(
  chords: ChordVoicing[],
  preset: GenrePreset,
): Promise<void> {
  stopPlayback()
  const generation = playbackGeneration
  const fakeMelody: MelodyNote[] = [
    {
      startTimeSeconds: 0,
      durationSeconds: chords.length * preset.chordDurationSeconds,
      pitchMidi: 60,
      amplitude: 0.1,
    },
  ]
  await playAccompanimentInternal(
    chords,
    preset,
    generation,
    'piano',
    fakeMelody,
  )
}

/** Melody + accompaniment together, same instrument, melody-synced timing. */
export async function playMelodyWithAccompaniment(
  notes: MelodyNote[],
  chords: ChordVoicing[],
  preset: GenrePreset,
  instrumentId: InstrumentId = 'piano',
): Promise<void> {
  stopPlayback()
  const generation = playbackGeneration

  const instrument = await getInstrument(instrumentId)
  if (generation !== playbackGeneration) return

  activeMelodyInstrumentId = instrumentId
  releaseInstrumentNotes(instrumentId)

  const span = melodySpanSeconds(notes)
  const accNotes = buildAccompanimentNotes(chords, preset, 0, span)

  console.log('[playMelodyWithAccompaniment]', {
    instrumentId,
    pattern: preset.pattern,
    melodyNotes: notes.length,
    accNotes: accNotes.length,
    span: Number(span.toFixed(3)),
    sampleAcc: accompanimentNoteNames(chords[0]?.notes ?? []),
  })

  const melodyEnd = scheduleMelodyNotes(instrument, notes, generation, 1)
  scheduleMelodyNotes(instrument, accNotes, generation, 0.5)

  await waitForPlayback(Math.max(melodyEnd, span) * 1000 + 250, generation)

  if (generation !== playbackGeneration) return
  if (activeMelodyInstrumentId === instrumentId) {
    activeMelodyInstrumentId = null
  }
}
