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
  /** true when this device registered it (legacy / display hint) */
  mine: boolean
  /** login_id of the uploader; only this user sees it under "내가 올린 것" */
  ownerId?: string | null
  /** Signed URL from backend GET/POST /audio (real recording) */
  audioUrl?: string | null
}

export function isOwnedBy(
  listing: MarketplaceListing,
  loginId: string | null | undefined,
): boolean {
  if (!loginId || loginId === 'guest') return false
  return listing.ownerId === loginId
}
