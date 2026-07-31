import * as Tone from 'tone'

/** Scientific pitch: C4, F#3, Bb2, etc. */
const NOTE_RE = /^([A-G])([#b]?)(-?\d+)$/i
const NOTE_NO_OCTAVE_RE = /^([A-G])([#b]?)$/i

/**
 * Normalize a note token to a Tone-compatible name (e.g. C4, F#3).
 * Returns null if it cannot be made playable.
 */
export function normalizeNoteName(raw: string): string | null {
  const trimmed = raw.trim().replace(/\s+/g, '')
  if (!trimmed) return null

  // Already scientific pitch
  let match = trimmed.match(NOTE_RE)
  if (match) {
    const step = match[1]!.toUpperCase()
    const accidental = match[2] === 'b' ? 'b' : match[2] === '#' ? '#' : ''
    const octave = Number(match[3])
    if (!Number.isFinite(octave) || octave < 0 || octave > 8) return null
    return `${step}${accidental}${octave}`
  }

  // Missing octave → default to 4
  match = trimmed.match(NOTE_NO_OCTAVE_RE)
  if (match) {
    const step = match[1]!.toUpperCase()
    const accidental = match[2] === 'b' ? 'b' : match[2] === '#' ? '#' : ''
    return `${step}${accidental}4`
  }

  // MIDI number as string ("60")
  if (/^\d{1,3}$/.test(trimmed)) {
    const midi = Number(trimmed)
    if (!Number.isFinite(midi) || midi < 12 || midi > 108) return null
    return Tone.Frequency(midi, 'midi').toNote()
  }

  return null
}

export function sanitizeChordNotes(notes: string[]): string[] {
  const out: string[] = []
  for (const n of notes) {
    if (typeof n !== 'string') continue
    const normalized = normalizeNoteName(n)
    if (normalized) out.push(normalized)
  }
  return out
}

export function isValidMidiPitch(pitchMidi: number): boolean {
  return Number.isFinite(pitchMidi) && pitchMidi >= 12 && pitchMidi <= 108
}

export function noteNameToMidi(name: string): number | null {
  const normalized = normalizeNoteName(name)
  if (!normalized) return null
  const midi = Math.round(Tone.Frequency(normalized).toMidi())
  return isValidMidiPitch(midi) ? midi : null
}

export function midiToSafeNoteName(pitchMidi: number): string | null {
  if (!isValidMidiPitch(pitchMidi)) return null
  return Tone.Frequency(pitchMidi, 'midi').toNote()
}
