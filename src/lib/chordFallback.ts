import type { ChordSuggestion, ChordVoicing } from '../types/chord'

const FALLBACK_PATTERNS: ChordSuggestion[] = [
  {
    label: '안정적인 팝 진행 (fallback)',
    chords: [
      { name: 'C', notes: ['C4', 'E4', 'G4'] },
      { name: 'Am', notes: ['A3', 'C4', 'E4'] },
      { name: 'F', notes: ['F3', 'A3', 'C4'] },
      { name: 'G', notes: ['G3', 'B3', 'D4'] },
      { name: 'Am', notes: ['A3', 'C4', 'E4'] },
      { name: 'F', notes: ['F3', 'A3', 'C4'] },
      { name: 'C', notes: ['C4', 'E4', 'G4'] },
      { name: 'G', notes: ['G3', 'B3', 'D4'] },
    ],
  },
  {
    label: '밝은 메이저 진행 (fallback)',
    chords: [
      { name: 'C', notes: ['C4', 'E4', 'G4'] },
      { name: 'G', notes: ['G3', 'B3', 'D4'] },
      { name: 'Am', notes: ['A3', 'C4', 'E4'] },
      { name: 'F', notes: ['F3', 'A3', 'C4'] },
      { name: 'C', notes: ['C4', 'E4', 'G4'] },
      { name: 'G', notes: ['G3', 'B3', 'D4'] },
      { name: 'F', notes: ['F3', 'A3', 'C4'] },
      { name: 'G', notes: ['G3', 'B3', 'D4'] },
    ],
  },
  {
    label: '부드러운 진행 (fallback)',
    chords: [
      { name: 'Am', notes: ['A3', 'C4', 'E4'] },
      { name: 'F', notes: ['F3', 'A3', 'C4'] },
      { name: 'C', notes: ['C4', 'E4', 'G4'] },
      { name: 'G', notes: ['G3', 'B3', 'D4'] },
      { name: 'Am', notes: ['A3', 'C4', 'E4'] },
      { name: 'F', notes: ['F3', 'A3', 'C4'] },
      { name: 'Dm', notes: ['D4', 'F4', 'A4'] },
      { name: 'G', notes: ['G3', 'B3', 'D4'] },
    ],
  },
]

/** Cycle pattern chords until length === n (then truncate). */
export function cycleChordsToLength(
  chords: ChordVoicing[],
  n: number,
): ChordVoicing[] {
  if (n <= 0 || chords.length === 0) return []
  const out: ChordVoicing[] = []
  for (let i = 0; i < n; i += 1) {
    out.push(chords[i % chords.length]!)
  }
  return out
}

/** Truncate if longer; pad with last chord if shorter. */
export function fitChordsToLength(
  chords: ChordVoicing[],
  n: number,
): ChordVoicing[] {
  if (n <= 0) return []
  if (chords.length === 0) return []
  if (chords.length === n) return chords
  if (chords.length > n) return chords.slice(0, n)
  const out = [...chords]
  const last = chords[chords.length - 1]!
  while (out.length < n) {
    out.push(last)
  }
  return out
}

export function getFallbackChordSuggestions(n: number): ChordSuggestion[] {
  const length = Math.max(1, n)
  return FALLBACK_PATTERNS.map((p) => ({
    label: p.label,
    chords: cycleChordsToLength(p.chords, length),
  }))
}

/** @deprecated Prefer getFallbackChordSuggestions(n) */
export const FALLBACK_CHORD_SUGGESTIONS: ChordSuggestion[] =
  getFallbackChordSuggestions(8)
