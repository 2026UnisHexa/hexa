import type { MelodyNote } from '../types/midi'

const PC_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const

/** Krumhansl-Kessler major / minor key profiles. */
const MAJOR_PROFILE = [
  6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88,
]
const MINOR_PROFILE = [
  6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17,
]

export type KeyMode = 'major' | 'minor'

export type DetectedKey = {
  root: number
  mode: KeyMode
  label: string
  confidence: number
  scalePitchClasses: Set<number>
}

export type KeyCorrectionResult = {
  notes: MelodyNote[]
  key: DetectedKey | null
  snappedCount: number
  removedCount: number
}

function pitchClass(midi: number): number {
  return ((Math.round(midi) % 12) + 12) % 12
}

function scaleDegrees(root: number, mode: KeyMode): Set<number> {
  const intervals = mode === 'major' ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 3, 5, 7, 8, 10]
  return new Set(intervals.map((i) => (root + i) % 12))
}

function correlate(a: number[], b: number[]): number {
  const n = a.length
  let meanA = 0
  let meanB = 0
  for (let i = 0; i < n; i += 1) {
    meanA += a[i]!
    meanB += b[i]!
  }
  meanA /= n
  meanB /= n

  let num = 0
  let denA = 0
  let denB = 0
  for (let i = 0; i < n; i += 1) {
    const da = a[i]! - meanA
    const db = b[i]! - meanB
    num += da * db
    denA += da * da
    denB += db * db
  }
  const den = Math.sqrt(denA * denB)
  return den < 1e-9 ? 0 : num / den
}

function rotateProfile(profile: number[], root: number): number[] {
  const out = new Array<number>(12)
  for (let i = 0; i < 12; i += 1) {
    out[i] = profile[(i - root + 12) % 12]!
  }
  return out
}

function weightedPitchClassHistogram(notes: MelodyNote[]): number[] {
  const hist = new Array<number>(12).fill(0)
  for (const note of notes) {
    const pc = pitchClass(note.pitchMidi)
    const weight =
      Math.max(0.05, note.durationSeconds) *
      Math.max(0.15, Math.min(1, note.amplitude || 0.5))
    hist[pc]! += weight
  }
  return hist
}

/** Estimate tonal center with KK key profiles. */
export function detectKey(notes: MelodyNote[]): DetectedKey | null {
  if (notes.length < 3) return null

  const hist = weightedPitchClassHistogram(notes)
  let best: DetectedKey | null = null

  for (let root = 0; root < 12; root += 1) {
    for (const mode of ['major', 'minor'] as const) {
      const profile = mode === 'major' ? MAJOR_PROFILE : MINOR_PROFILE
      const score = correlate(hist, rotateProfile(profile, root))
      if (!best || score > best.confidence) {
        best = {
          root,
          mode,
          label: `${PC_NAMES[root]}${mode === 'major' ? '' : 'm'}`,
          confidence: score,
          scalePitchClasses: scaleDegrees(root, mode),
        }
      }
    }
  }

  return best
}

function nearestScaleMidi(midi: number, scale: Set<number>): number {
  const rounded = Math.round(midi)
  const pc = pitchClass(rounded)
  if (scale.has(pc)) return rounded

  let bestMidi = rounded
  let bestDist = Infinity
  for (const delta of [-2, -1, 1, 2, -3, 3, -4, 4, -5, 5, -6, 6]) {
    const candidate = rounded + delta
    if (candidate < 12 || candidate > 108) continue
    if (!scale.has(pitchClass(candidate))) continue
    const dist = Math.abs(delta)
    if (dist < bestDist) {
      bestDist = dist
      bestMidi = candidate
    }
  }
  return bestMidi
}

function medianAmplitude(notes: MelodyNote[]): number {
  if (notes.length === 0) return 0.5
  const vals = notes
    .map((n) => (Number.isFinite(n.amplitude) ? n.amplitude : 0.5))
    .sort((a, b) => a - b)
  return vals[Math.floor(vals.length / 2)]!
}

function medianDuration(notes: MelodyNote[]): number {
  if (notes.length === 0) return 0.2
  const vals = notes.map((n) => n.durationSeconds).sort((a, b) => a - b)
  return vals[Math.floor(vals.length / 2)]!
}

/**
 * After denoise + pitch detect:
 * 1) estimate key
 * 2) remove blip/noise-like out-of-key notes
 * 3) snap remaining out-of-key notes to nearest scale degree
 */
export function correctMelodyToKey(notes: MelodyNote[]): KeyCorrectionResult {
  if (notes.length === 0) {
    return { notes: [], key: null, snappedCount: 0, removedCount: 0 }
  }

  const key = detectKey(notes)
  if (!key || key.confidence < 0.15) {
    // Too ambiguous — only drop extreme short blips
    const filtered = notes.filter((n) => n.durationSeconds >= 0.06)
    return {
      notes: filtered,
      key,
      snappedCount: 0,
      removedCount: notes.length - filtered.length,
    }
  }

  const ampMed = medianAmplitude(notes)
  const durMed = medianDuration(notes)
  const scale = key.scalePitchClasses

  let removedCount = 0
  let snappedCount = 0
  const kept: MelodyNote[] = []

  for (let i = 0; i < notes.length; i += 1) {
    const note = notes[i]!
    const pc = pitchClass(note.pitchMidi)
    const inScale = scale.has(pc)
    const short = note.durationSeconds < Math.max(0.08, durMed * 0.35)
    const quiet = (note.amplitude || 0) < ampMed * 0.45
    const prev = notes[i - 1]
    const next = notes[i + 1]
    const leapFromPrev =
      prev != null && Math.abs(note.pitchMidi - prev.pitchMidi) >= 8
    const leapToNext =
      next != null && Math.abs(note.pitchMidi - next.pitchMidi) >= 8

    // Noise-like: out of key + (short/quiet) + often a leap
    const noiseLike =
      !inScale && (short || quiet) && (leapFromPrev || leapToNext || short)

    if (noiseLike && short && quiet) {
      removedCount += 1
      continue
    }

    if (!inScale) {
      const snapped = nearestScaleMidi(note.pitchMidi, scale)
      if (snapped !== Math.round(note.pitchMidi)) {
        snappedCount += 1
        kept.push({ ...note, pitchMidi: snapped })
        continue
      }
    }

    kept.push(note)
  }

  console.log('[keyCorrection]', {
    key: key.label,
    confidence: Number(key.confidence.toFixed(3)),
    snappedCount,
    removedCount,
    before: notes.length,
    after: kept.length,
  })

  return { notes: kept, key, snappedCount, removedCount }
}

export function formatKeyLabel(key: DetectedKey | null): string {
  if (!key) return '조성 미확정'
  const modeKo = key.mode === 'major' ? '장조' : '단조'
  return `${key.label} (${PC_NAMES[key.root]} ${modeKo})`
}
