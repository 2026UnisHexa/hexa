import { loadJson, saveJson } from './storage'
import { AUTH_LOGIN_KEY, USER_STORAGE_KEY } from '../types/user'
import type { UserProfile } from '../types/user'

export const AUTH_TOKEN_KEY = 'auth-access-token'

export type AuthSession = {
  loginId: string
  accessToken: string
}

export type MeResult =
  | { status: 'ok'; loginId: string }
  | { status: 'unauthorized' }
  | { status: 'unavailable' }
  | { status: 'skipped' }

export function getApiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')
}

export function getAccessToken(): string | null {
  const token = loadJson<string>(AUTH_TOKEN_KEY)
  return typeof token === 'string' && token.trim() ? token.trim() : null
}

export function getStoredLoginId(): string | null {
  const id = loadJson<string>(AUTH_LOGIN_KEY)
  return typeof id === 'string' && id.trim() ? id.trim() : null
}

export function authHeaders(extra?: HeadersInit): HeadersInit {
  const token = getAccessToken()
  return {
    ...(extra ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export function persistSession(session: AuthSession): void {
  const loginId = session.loginId.trim()
  saveJson(AUTH_LOGIN_KEY, loginId)
  saveJson(AUTH_TOKEN_KEY, session.accessToken)

  const existing = loadJson<UserProfile>(USER_STORAGE_KEY)
  if (!existing || existing.loginId !== loginId) {
    const profile: UserProfile = {
      loginId,
      displayName: loginId,
      bio: '',
      joinedAt: new Date().toISOString(),
    }
    saveJson(USER_STORAGE_KEY, profile)
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(`hexa:${AUTH_LOGIN_KEY}`)
    localStorage.removeItem(`hexa:${AUTH_TOKEN_KEY}`)
  } catch {
    // ignore
  }
}

/** Read login id from JWT payload without verifying signature (demo). */
export function readLoginIdFromToken(token: string): string | null {
  try {
    const part = token.split('.')[1]
    if (!part) return null
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'))
    const payload = JSON.parse(json) as Record<string, unknown>
    if (typeof payload.login_id === 'string' && payload.login_id.trim()) {
      return payload.login_id.trim()
    }
    if (typeof payload.sub === 'string' && payload.sub.trim()) {
      return payload.sub.trim()
    }
    return null
  } catch {
    return null
  }
}

/**
 * Validate JWT with backend GET /me when available.
 * Render 배포본에는 /me 가 없을 수 있음 → unavailable (세션 유지).
 */
export async function fetchMe(): Promise<MeResult> {
  const base = getApiBaseUrl()
  const token = getAccessToken()
  if (!base || !token) return { status: 'skipped' }

  try {
    const res = await fetch(`${base}/me`, {
      headers: authHeaders(),
    })

    // Backend has no /me yet (current Render OpenAPI).
    if (res.status === 404) {
      return { status: 'unavailable' }
    }

    if (res.status === 401 || res.status === 403) {
      return { status: 'unauthorized' }
    }

    if (!res.ok) {
      return { status: 'unavailable' }
    }

    const data = (await res.json()) as {
      login_id?: unknown
      loginId?: unknown
    }
    if (typeof data.login_id === 'string' && data.login_id.trim()) {
      return { status: 'ok', loginId: data.login_id.trim() }
    }
    if (typeof data.loginId === 'string' && data.loginId.trim()) {
      return { status: 'ok', loginId: data.loginId.trim() }
    }

    const fromToken = readLoginIdFromToken(token)
    if (fromToken) return { status: 'ok', loginId: fromToken }
    return { status: 'unavailable' }
  } catch {
    return { status: 'unavailable' }
  }
}
