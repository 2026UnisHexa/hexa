import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthPage } from './components/Page/AuthPage.tsx'
import { persistSession } from './lib/auth'

let path = window.location.pathname.replace(/\/$/, '') || '/'

if (path === '/') {
  window.history.replaceState(null, '', '/login')
  path = '/login'
}

const isAuthPage = path === '/login' || path === '/signup'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAuthPage ? (
      <AuthPage
        initialSignupOpen={path === '/signup'}
        onAuthenticated={(session) => {
          persistSession(session)
          window.location.assign('/home')
        }}
      />
    ) : (
      <App />
    )}
  </StrictMode>,
)
