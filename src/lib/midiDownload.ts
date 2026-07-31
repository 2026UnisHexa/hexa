import { Midi } from '@tonejs/midi'
import type { MelodyNote } from '../types/midi'

export function melodyNotesToMidiBlob(notes: MelodyNote[]): Blob {
  const midi = new Midi()
  const track = midi.addTrack()
  track.name = 'Melody'

  for (const note of notes) {
    track.addNote({
      midi: note.pitchMidi,
      time: note.startTimeSeconds,
      duration: Math.max(0.05, note.durationSeconds),
      velocity: Math.min(1, Math.max(0.1, note.amplitude)),
    })
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
