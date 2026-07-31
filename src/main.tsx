import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthPage } from './components/Page/AuthPage.tsx'

const path = window.location.pathname.replace(/\/$/, '') || '/'
const isAuthPage = path === '/login' || path === '/signup'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAuthPage ? (
      <AuthPage
        initialSignupOpen={path === '/signup'}
        onAuthenticated={() => window.location.assign('/')}
      />
    ) : (
      <App />
    )}
  </StrictMode>,
)
