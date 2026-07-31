import type { GenreId } from './genre'

export type MarketplaceListing = {
  id: string
  title: string
  price: number
  genreId: GenreId
  genreLabel: string
  chordLabel: string | null
  noteCount: number
  tempoBpm: number
  createdAt: string
  mine: boolean
}
