import { authHeaders, getAccessToken, getApiBaseUrl } from './auth'
import type { GenreId } from '../types/genre'
import type { MarketplaceListing } from '../types/listing'
import { GENRE_PRESETS } from './presets'

export type AudioFileDto = {
  id: string
  loginId: string
  title: string
  price: number
  genreLabel: string | null
  chordLabel?: string | null
  tempoBpm?: number | null
  noteCount?: number | null
  audioFile: string
  createdAt: string
}

export type UploadAudioInput = {
  title: string
  price: number
  genreLabel: string
  chordLabel?: string | null
  tempoBpm?: number
  noteCount?: number
  audioBlob: Blob
  fileName?: string
}

function requireApiBase(): string {
  const base = getApiBaseUrl()
  if (!base) {
    throw new Error('API 주소(VITE_API_BASE_URL)가 설정되지 않았습니다.')
  }
  return base
}

function requireToken(): string {
  const token = getAccessToken()
  if (!token) {
    throw new Error('로그인이 필요합니다. 다시 로그인해 주세요.')
  }
  return token
}

function genreIdFromLabel(label: string | null | undefined): GenreId {
  const found = GENRE_PRESETS.find((p) => p.label === label)
  return found?.id ?? 'pop'
}

export function audioDtoToListing(dto: AudioFileDto): MarketplaceListing {
  const createdAt =
    typeof dto.createdAt === 'string'
      ? dto.createdAt
      : new Date(dto.createdAt).toISOString()

  return {
    id: dto.id,
    title: dto.title,
    price: Number(dto.price) || 0,
    genreId: genreIdFromLabel(dto.genreLabel),
    genreLabel: dto.genreLabel?.trim() || '팝',
    chordLabel: dto.chordLabel ?? null,
    noteCount: dto.noteCount ?? 0,
    tempoBpm: dto.tempoBpm ?? 90,
    createdAt,
    mine: true,
    ownerId: dto.loginId,
    audioUrl: dto.audioFile || null,
  }
}

function parseErrorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') return fallback
  const detail = (data as { detail?: unknown }).detail
  if (typeof detail === 'string' && detail.trim()) return detail
  if (Array.isArray(detail) && detail[0] && typeof detail[0] === 'object') {
    const msg = (detail[0] as { msg?: unknown }).msg
    if (typeof msg === 'string') return msg
  }
  return fallback
}

export async function listMyAudio(): Promise<MarketplaceListing[]> {
  requireToken()
  const base = requireApiBase()
  const res = await fetch(`${base}/audio`, {
    headers: authHeaders(),
  })
  const data: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(parseErrorMessage(data, `음원 목록 조회 실패 (${res.status})`))
  }
  if (!Array.isArray(data)) return []
  return data.map((item) => audioDtoToListing(item as AudioFileDto))
}

export async function uploadAudio(
  input: UploadAudioInput,
): Promise<MarketplaceListing> {
  requireToken()
  const base = requireApiBase()

  const form = new FormData()
  form.append('title', input.title)
  form.append('price', String(input.price))
  form.append('genreLabel', input.genreLabel)
  if (input.chordLabel) form.append('chordLabel', input.chordLabel)
  if (input.tempoBpm != null) form.append('tempoBpm', String(input.tempoBpm))
  if (input.noteCount != null) form.append('noteCount', String(input.noteCount))

  const ext = input.audioBlob.type.includes('webm')
    ? 'webm'
    : input.audioBlob.type.includes('mp4') || input.audioBlob.type.includes('m4a')
      ? 'm4a'
      : 'wav'
  form.append(
    'audioFile',
    input.audioBlob,
    input.fileName ?? `hexa-recording.${ext}`,
  )

  const res = await fetch(`${base}/audio`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  })
  const data: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(parseErrorMessage(data, `음원 등록 실패 (${res.status})`))
  }
  return audioDtoToListing(data as AudioFileDto)
}

export async function deleteRemoteAudio(audioId: string): Promise<void> {
  requireToken()
  const base = requireApiBase()
  const res = await fetch(`${base}/audio/${encodeURIComponent(audioId)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (res.status === 204 || res.ok) return
  const data: unknown = await res.json().catch(() => null)
  throw new Error(parseErrorMessage(data, `음원 삭제 실패 (${res.status})`))
}

/** UUID from backend vs local `mine-...` ids */
export function isRemoteListingId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id,
  )
}
