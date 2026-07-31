import * as Tone from 'tone'

/** Scientific pitch: C4, F#3, Bb2, etc. */
const NOTE_RE = /^([A-G])([#b]?)(-?\d+)$/i
const NOTE_NO_OCTAVE_RE = /^([A-G])([#b]?)$/i

function coerceNoteToken(raw: unknown): string | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return String(Math.round(raw))
  }
  if (typeof raw !== 'string') return null
  // Unicode accidentals → ASCII; split "C4 E4 G4" / "C4,E4,G4" later
  return raw
    .trim()
    .replace(/♭/g, 'b')
    .replace(/♯/g, '#')
    .replace(/\s+/g, '')
}

/**
 * Normalize a note token to a Tone-compatible name (e.g. C4, F#3).
 * Returns null if it cannot be made playable.
 */
export function normalizeNoteName(raw: string | number): string | null {
  const trimmed = coerceNoteToken(raw)
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

/** Expand one API note entry into zero or more playable note names. */
function expandNoteEntry(raw: unknown): string[] {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const n = normalizeNoteName(raw)
    return n ? [n] : []
  }
  if (typeof raw !== 'string') return []
  const parts = raw
    .replace(/♭/g, 'b')
    .replace(/♯/g, '#')
    .split(/[\s,|/]+/)
    .map((p) => p.trim())
    .filter(Boolean)
  const out: string[] = []
  for (const part of parts) {
    const n = normalizeNoteName(part)
    if (n) out.push(n)
  }
  return out
}

export function sanitizeChordNotes(notes: unknown[]): string[] {
  const out: string[] = []
  for (const n of notes) {
    out.push(...expandNoteEntry(n))
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
