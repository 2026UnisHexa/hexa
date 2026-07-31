import { loadJson, saveJson } from './storage'
import { AUTH_LOGIN_KEY, USER_STORAGE_KEY } from '../types/user'
import type { UserProfile } from '../types/user'

export const AUTH_TOKEN_KEY = 'auth-access-token'

export type AuthSession = {
  loginId: string
  accessToken: string
}

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

/**
 * Validate JWT with backend GET /me.
 * Returns login_id on success, null on failure.
 */
export async function fetchMe(): Promise<string | null> {
  const base = getApiBaseUrl()
  const token = getAccessToken()
  if (!base || !token) return null

  try {
    const res = await fetch(`${base}/me`, {
      headers: authHeaders(),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { login_id?: unknown }
    return typeof data.login_id === 'string' ? data.login_id : null
  } catch {
    return null
  }
}
