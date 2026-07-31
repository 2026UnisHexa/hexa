export const GENRE_IDS = ['ballad', 'jazz', 'pop'] as const

export type GenreId = (typeof GENRE_IDS)[number]

export type GenrePreset = {
  id: GenreId
  label: string
  chordDurationSeconds: number
  pattern: 'block' | 'arpeggio' | 'offbeat'
}
