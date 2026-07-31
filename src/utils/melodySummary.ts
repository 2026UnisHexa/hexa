import type { MelodyNote } from '../types/midi'

const NOTE_NAMES = [
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

export function midiToNoteName(pitchMidi: number): string {
  const name = NOTE_NAMES[((pitchMidi % 12) + 12) % 12]
  const octave = Math.floor(pitchMidi / 12) - 1
  return `${name}${octave}`
}

export function estimateTempoBpm(notes: MelodyNote[]): number {
  if (notes.length < 2) return 90
  const starts = notes.map((n) => n.startTimeSeconds).sort((a, b) => a - b)
  const gaps: number[] = []
  for (let i = 1; i < starts.length; i += 1) {
    const gap = starts[i]! - starts[i - 1]!
    if (gap > 0.15 && gap < 2) gaps.push(gap)
  }
  if (gaps.length === 0) return 90
  const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length
  const bpm = Math.round(60 / avg)
  return Math.min(160, Math.max(60, bpm))
}

export function summarizeMelody(notes: MelodyNote[], tempoBpm: number): string {
  if (notes.length === 0) {
    return 'empty melody, 4/4, tempo about 90'
  }
  const names = notes.slice(0, 24).map((n) => midiToNoteName(n.pitchMidi))
  const joined = names.join('-')
  return `${joined}, 4/4, tempo about ${tempoBpm}`
}
