export type ChordVoicing = {
  name: string
  notes: string[]
}

export type ChordSuggestion = {
  label: string
  chords: ChordVoicing[]
}
