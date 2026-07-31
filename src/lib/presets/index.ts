import type { GenreId, GenrePreset } from '../../types/genre'
import { balladPreset } from './ballad'
import { jazzPreset } from './jazz'
import { popPreset } from './pop'

export const GENRE_PRESETS: GenrePreset[] = [
  balladPreset,
  jazzPreset,
  popPreset,
]

export function getGenrePreset(id: GenreId): GenrePreset {
  return GENRE_PRESETS.find((p) => p.id === id) ?? popPreset
}
