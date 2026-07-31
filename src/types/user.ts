export type UserProfile = {
  loginId: string
  displayName: string
  bio: string
  joinedAt: string
}

export const USER_STORAGE_KEY = 'user-profile'
export const AUTH_LOGIN_KEY = 'auth-login-id'
