export type MelodyNote = {
  startTimeSeconds: number
  durationSeconds: number
  pitchMidi: number
  amplitude: number
}

export type Melody = {
  notes: MelodyNote[]
  tempoBpm: number
}
