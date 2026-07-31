import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthPage } from './components/Page/AuthPage.tsx'
import { saveJson } from './lib/storage'
import { AUTH_LOGIN_KEY, USER_STORAGE_KEY } from './types/user'
import type { UserProfile } from './types/user'

const path = window.location.pathname.replace(/\/$/, '') || '/'
const isAuthPage = path === '/login' || path === '/signup'

function persistLogin(loginId: string) {
  saveJson(AUTH_LOGIN_KEY, loginId)
  const existing = (() => {
    try {
      const raw = localStorage.getItem(`hexa:${USER_STORAGE_KEY}`)
      return raw ? (JSON.parse(raw) as UserProfile) : null
    } catch {
      return null
    }
  })()
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAuthPage ? (
      <AuthPage
        initialSignupOpen={path === '/signup'}
        onAuthenticated={(loginId) => {
          persistLogin(loginId)
          window.location.assign('/')
        }}
      />
    ) : (
      <App />
    )}
  </StrictMode>,
)
