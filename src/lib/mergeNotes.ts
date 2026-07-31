import type { MelodyNote } from '../types/midi'

/** Max gap (sec) between notes to consider merging. */
const MERGE_GAP_SEC = 0.1
/** Pitch difference (semitones) allowed when merging jittered same tone. */
const MERGE_PITCH_TOL = 1
/** Notes shorter than this prefer to merge with neighbors. */
const SHORT_NOTE_SEC = 0.14
/** Drop leftover blips after merge. */
const MIN_KEEP_SEC = 0.08

function noteEnd(n: MelodyNote): number {
  return n.startTimeSeconds + n.durationSeconds
}

function shouldMerge(a: MelodyNote, b: MelodyNote): boolean {
  const gap = b.startTimeSeconds - noteEnd(a)
  if (gap > MERGE_GAP_SEC) return false

  const pitchDiff = Math.abs(a.pitchMidi - b.pitchMidi)
  if (pitchDiff > MERGE_PITCH_TOL) return false

  const eitherShort =
    a.durationSeconds < SHORT_NOTE_SEC || b.durationSeconds < SHORT_NOTE_SEC
  const overlapping = gap <= 0.02
  return eitherShort || overlapping || pitchDiff === 0
}

function mergePair(a: MelodyNote, b: MelodyNote): MelodyNote {
  const end = Math.max(noteEnd(a), noteEnd(b))
  const aWeight = a.durationSeconds * Math.max(0.1, a.amplitude)
  const bWeight = b.durationSeconds * Math.max(0.1, b.amplitude)
  return {
    startTimeSeconds: a.startTimeSeconds,
    durationSeconds: Math.max(MIN_KEEP_SEC, end - a.startTimeSeconds),
    pitchMidi: aWeight >= bWeight ? a.pitchMidi : b.pitchMidi,
    amplitude: Math.max(a.amplitude, b.amplitude),
  }
}

/**
 * Collapse over-segmented Basic Pitch output:
 * merge same/near-pitch notes with tiny gaps, then drop remaining micro-blips.
 */
export function mergeShortNotes(notes: MelodyNote[]): {
  notes: MelodyNote[]
  before: number
  after: number
} {
  if (notes.length <= 1) {
    return { notes: [...notes], before: notes.length, after: notes.length }
  }

  const sorted = [...notes].sort(
    (a, b) => a.startTimeSeconds - b.startTimeSeconds,
  )

  let current = { ...sorted[0]! }
  const merged: MelodyNote[] = []

  for (let i = 1; i < sorted.length; i += 1) {
    const next = sorted[i]!
    if (shouldMerge(current, next)) {
      current = mergePair(current, next)
    } else {
      merged.push(current)
      current = { ...next }
    }
  }
  merged.push(current)

  // Second pass: merge again after first collapse (catches chains)
  const second: MelodyNote[] = []
  if (merged.length > 0) {
    let cur = { ...merged[0]! }
    for (let i = 1; i < merged.length; i += 1) {
      const next = merged[i]!
      if (shouldMerge(cur, next)) {
        cur = mergePair(cur, next)
      } else {
        second.push(cur)
        cur = { ...next }
      }
    }
    second.push(cur)
  }

  const cleaned = second.filter((n) => n.durationSeconds >= MIN_KEEP_SEC)

  console.log('[mergeShortNotes]', {
    before: notes.length,
    afterMerge: second.length,
    afterFilter: cleaned.length,
  })

  return {
    notes: cleaned,
    before: notes.length,
    after: cleaned.length,
  }
}
