import { Midi } from '@tonejs/midi'
import type { MelodyNote } from '../types/midi'

function addNotesToTrack(
  track: ReturnType<Midi['addTrack']>,
  notes: MelodyNote[],
): void {
  for (const note of notes) {
    track.addNote({
      midi: note.pitchMidi,
      time: note.startTimeSeconds,
      duration: Math.max(0.05, note.durationSeconds),
      velocity: Math.min(1, Math.max(0.1, note.amplitude)),
    })
  }
}

/** Melody-only MIDI (원본). */
export function melodyNotesToMidiBlob(notes: MelodyNote[]): Blob {
  const midi = new Midi()
  const track = midi.addTrack()
  track.name = 'Melody'
  addNotesToTrack(track, notes)

  return new Blob([midi.toArray().buffer as ArrayBuffer], {
    type: 'audio/midi',
  })
}

/** Melody + accompaniment tracks (코드·장르 반영). */
export function compositionToMidiBlob(
  melody: MelodyNote[],
  accompaniment: MelodyNote[],
): Blob {
  const midi = new Midi()

  const melodyTrack = midi.addTrack()
  melodyTrack.name = 'Melody'
  addNotesToTrack(melodyTrack, melody)

  if (accompaniment.length > 0) {
    const accTrack = midi.addTrack()
    accTrack.name = 'Accompaniment'
    addNotesToTrack(accTrack, accompaniment)
  }

  return new Blob([midi.toArray().buffer as ArrayBuffer], {
    type: 'audio/midi',
  })
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
