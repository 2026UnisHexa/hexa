import type { ChordVoicing } from '../types/chord'
import type { MarketplaceListing } from '../types/listing'
import type { MelodyNote } from '../types/midi'
import { FALLBACK_CHORD_SUGGESTIONS } from './chordFallback'
import { getGenrePreset } from './presets'
import { playMelodyWithAccompaniment, stopPlayback } from './accompaniment'

const MELODY_MOTIFS: number[][] = [
  [60, 62, 64, 67, 64, 62, 60, 67], // C major-ish
  [57, 60, 64, 67, 64, 60, 57, 62], // Am color
  [62, 64, 65, 67, 69, 67, 65, 64], // Dorian-ish walk
  [55, 60, 64, 67, 72, 67, 64, 60], // rising
]

function hashId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i += 1) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0
  }
  return h
}

function pickChords(listing: MarketplaceListing): ChordVoicing[] {
  const patterns = FALLBACK_CHORD_SUGGESTIONS
  const idx = hashId(listing.id) % patterns.length
  const base = patterns[idx]!.chords
  // Short preview: 4 chords
  return base.slice(0, 4)
}

/** Synthetic hummed melody for marketplace demo preview (no real recording). */
export function buildListingPreviewMelody(
  listing: MarketplaceListing,
): MelodyNote[] {
  const motif = MELODY_MOTIFS[hashId(listing.id) % MELODY_MOTIFS.length]!
  const bpm = Math.min(140, Math.max(70, listing.tempoBpm || 90))
  const beat = 60 / bpm
  const notes: MelodyNote[] = []

  motif.forEach((midi, i) => {
    notes.push({
      startTimeSeconds: i * beat * 0.85,
      durationSeconds: beat * 0.7,
      pitchMidi: midi,
      amplitude: 0.7,
    })
  })

  return notes
}

export async function playListingPreview(
  listing: MarketplaceListing,
): Promise<void> {
  const preset = getGenrePreset(listing.genreId)
  const melody = buildListingPreviewMelody(listing)
  const chords = pickChords(listing)
  await playMelodyWithAccompaniment(melody, chords, preset, 'piano')
}

export function stopListingPreview(): void {
  stopPlayback()
}
