import type { ChordVoicing } from '../types/chord'
import { getInstrument, releaseInstrumentNotes } from './instruments'
import { sanitizeChordNotes } from './noteSanitize'

let chordWaitTimer: ReturnType<typeof setTimeout> | null = null
let chordWaitResolve: (() => void) | null = null
let chordGeneration = 0
const chordNoteTimers = new Set<ReturnType<typeof setTimeout>>()

function clearChordNoteTimers(): void {
  for (const timer of chordNoteTimers) {
    clearTimeout(timer)
  }
  chordNoteTimers.clear()
}

export function isUsingPianoSampler(): boolean {
  return true
}

export async function playChordProgression(
  chords: ChordVoicing[],
  chordDurationSeconds = 0.8,
): Promise<void> {
  const generation = ++chordGeneration
  clearChordNoteTimers()
  if (chordWaitTimer !== null) {
    clearTimeout(chordWaitTimer)
    chordWaitTimer = null
  }
  if (chordWaitResolve) {
    const resolve = chordWaitResolve
    chordWaitResolve = null
    resolve()
  }

  const instrument = await getInstrument('piano')
  if (generation !== chordGeneration) return

  releaseInstrumentNotes('piano')

  chords.forEach((chord, i) => {
    const playable = sanitizeChordNotes(chord.notes)
    if (playable.length === 0) {
      console.warn('[chordPlayback] skip chord with no playable notes', chord)
      return
    }
    const delayMs = i * chordDurationSeconds * 1000
    const timer = setTimeout(() => {
      chordNoteTimers.delete(timer)
      if (generation !== chordGeneration) return
      try {
        instrument.triggerAttackRelease(
          playable,
          chordDurationSeconds * 0.9,
          undefined,
        )
      } catch (err) {
        console.warn('[chordPlayback] trigger failed', { playable, err })
      }
    }, delayMs)
    chordNoteTimers.add(timer)
  })

  await new Promise<void>((resolve) => {
    chordWaitResolve = resolve
    chordWaitTimer = setTimeout(() => {
      chordWaitTimer = null
      chordWaitResolve = null
      resolve()
    }, chords.length * chordDurationSeconds * 1000 + 100)
  })
}

export async function stopChordPlayback(): Promise<void> {
  chordGeneration += 1
  clearChordNoteTimers()
  if (chordWaitTimer !== null) {
    clearTimeout(chordWaitTimer)
    chordWaitTimer = null
  }
  if (chordWaitResolve) {
    const resolve = chordWaitResolve
    chordWaitResolve = null
    resolve()
  }
  releaseInstrumentNotes('piano')
}
