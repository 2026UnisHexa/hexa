import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

type AuthResponse = {
  success: boolean
  message: string
  login_id: string
}

type AuthPageProps = {
  onAuthenticated: (loginId: string) => void
  initialSignupOpen?: boolean
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

function BrandMark() {
  return (
    <svg viewBox="0 0 44 44" aria-hidden="true">
      <path d="M15.5 8.5v20.2a6.8 6.8 0 1 1-3-5.65V13.2L32 9v15.7a6.8 6.8 0 1 1-3-5.65V5.3L15.5 8.5Z" />
    </svg>
  )
}

function EyeIcon({ closed }: { closed: boolean }) {
  return closed ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m3 3 18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 5.2A10.8 10.8 0 0 1 12 5c5.5 0 9 7 9 7a16 16 0 0 1-2.1 3.1M6.6 6.6C4.3 8.2 3 12 3 12s3.5 7 9 7c1.5 0 2.9-.5 4.1-1.2" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  )
}

async function requestAuth(path: 'login' | 'signup', loginId: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login_id: loginId.trim(), password }),
  })
  const data = (await response.json().catch(() => null)) as AuthResponse | { detail?: string } | null
  if (!response.ok) {
    throw new Error(data && 'detail' in data && data.detail ? data.detail : '요청을 처리하지 못했습니다.')
  }
  return data as AuthResponse
}

export function AuthPage({ onAuthenticated, initialSignupOpen = false }: AuthPageProps) {
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [signupOpen, setSignupOpen] = useState(initialSignupOpen)
  const [signupId, setSignupId] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupConfirm, setSignupConfirm] = useState('')
  const [signupError, setSignupError] = useState<string | null>(null)
  const [signupLoading, setSignupLoading] = useState(false)
  const [showSignupPassword, setShowSignupPassword] = useState(false)

  useEffect(() => {
    if (!signupOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !signupLoading) setSignupOpen(false)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [signupOpen, signupLoading])

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    if (!loginId.trim() || !password) {
      setError('아이디와 비밀번호를 모두 입력해 주세요.')
      return
    }
    setLoading(true)
    try {
      await requestAuth('login', loginId, password)
      onAuthenticated(loginId.trim())
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '서버에 연결할 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSignupError(null)
    if (!signupId.trim() || !signupPassword || !signupConfirm) {
      setSignupError('모든 항목을 입력해 주세요.')
      return
    }
    if (signupPassword.length < 4) {
      setSignupError('비밀번호는 4자 이상으로 입력해 주세요.')
      return
    }
    if (signupPassword !== signupConfirm) {
      setSignupError('비밀번호가 일치하지 않습니다.')
      return
    }
    setSignupLoading(true)
    try {
      await requestAuth('signup', signupId, signupPassword)
      setLoginId(signupId.trim())
      setPassword('')
      setSignupOpen(false)
      setSignupId('')
      setSignupPassword('')
      setSignupConfirm('')
      setNotice('회원가입이 완료되었습니다. 새 계정으로 로그인해 주세요.')
      window.history.replaceState(null, '', '/login')
    } catch (requestError) {
      setSignupError(requestError instanceof Error ? requestError.message : '서버에 연결할 수 없습니다.')
    } finally {
      setSignupLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-visual" aria-label="Hexa 서비스 소개">
        <div className="auth-visual__blob auth-visual__blob--one" />
        <div className="auth-visual__blob auth-visual__blob--two" />
        <div className="brand brand--light"><span className="brand__mark"><BrandMark /></span><span>HEXA</span></div>
        <div className="auth-visual__copy">
          <span className="auth-visual__eyebrow">MAKE YOUR SOUND VISIBLE</span>
          <h1>머릿속 멜로디를<br />음악으로 완성하세요.</h1>
          <p>허밍 한 번이면 악보가 되고,<br />AI가 당신의 음악적 영감을 이어갑니다.</p>
        </div>
        <div className="sound-wave" aria-hidden="true">
          {[28, 48, 72, 44, 92, 62, 34, 78, 54, 30, 64, 42, 24].map((height, index) => <span key={index} style={{ height }} />)}
        </div>
        <p className="auth-visual__footer">© 2026 HEXA. CREATE YOUR OWN MUSIC.</p>
      </section>

      <section className="auth-form-panel">
        <div className="brand brand--mobile"><span className="brand__mark"><BrandMark /></span><span>HEXA</span></div>
        <div className="auth-card">
          <div className="auth-card__heading">
            <p className="auth-card__kicker">WELCOME TO HEXA</p>
            <h2>다시 만나서 반가워요</h2>
            <p>계정에 로그인하고 음악을 이어서 만들어 보세요.</p>
          </div>
          <form className="auth-form" onSubmit={handleLogin}>
            <label><span>아이디</span><input autoFocus autoComplete="username" value={loginId} onChange={(event) => setLoginId(event.target.value)} placeholder="아이디를 입력해 주세요" /></label>
            <label>
              <span>비밀번호</span>
              <span className="password-field">
                <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="비밀번호를 입력해 주세요" />
                <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}><EyeIcon closed={!showPassword} /></button>
              </span>
            </label>
            {error ? <p className="auth-message auth-message--error" role="alert">{error}</p> : null}
            {notice ? <p className="auth-message auth-message--success" role="status">{notice}</p> : null}
            <button className="auth-submit" type="submit" disabled={loading}>{loading ? <span className="auth-spinner" /> : null}{loading ? '로그인 중입니다' : '로그인'}</button>
          </form>
          <p className="auth-switch">아직 계정이 없으신가요?{' '}<button type="button" onClick={() => { setSignupError(null); setSignupOpen(true) }}>회원가입</button></p>
        </div>
      </section>

      {signupOpen ? (
        <div className="signup-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !signupLoading) setSignupOpen(false) }}>
          <section className="signup-modal" role="dialog" aria-modal="true" aria-labelledby="signup-title">
            <button className="signup-modal__close" type="button" onClick={() => setSignupOpen(false)} disabled={signupLoading} aria-label="회원가입 닫기">×</button>
            <div className="signup-modal__header">
              <span className="brand__mark"><BrandMark /></span>
              <div><p>JOIN HEXA</p><h2 id="signup-title">새로운 음악 여정을 시작해요</h2><span>간단한 정보로 나만의 계정을 만들어 보세요.</span></div>
            </div>
            <form className="auth-form signup-form" onSubmit={handleSignup}>
              <label><span>아이디</span><input autoFocus autoComplete="username" value={signupId} onChange={(event) => setSignupId(event.target.value)} placeholder="사용할 아이디를 입력해 주세요" /></label>
              <label>
                <span>비밀번호</span>
                <span className="password-field">
                  <input type={showSignupPassword ? 'text' : 'password'} autoComplete="new-password" value={signupPassword} onChange={(event) => setSignupPassword(event.target.value)} placeholder="4자 이상 입력해 주세요" />
                  <button type="button" onClick={() => setShowSignupPassword((value) => !value)} aria-label={showSignupPassword ? '비밀번호 숨기기' : '비밀번호 보기'}><EyeIcon closed={!showSignupPassword} /></button>
                </span>
              </label>
              <label><span>비밀번호 확인</span><input type={showSignupPassword ? 'text' : 'password'} autoComplete="new-password" value={signupConfirm} onChange={(event) => setSignupConfirm(event.target.value)} placeholder="비밀번호를 한 번 더 입력해 주세요" /></label>
              {signupError ? <p className="auth-message auth-message--error" role="alert">{signupError}</p> : null}
              <button className="auth-submit" type="submit" disabled={signupLoading}>{signupLoading ? <span className="auth-spinner" /> : null}{signupLoading ? '계정을 만들고 있어요' : '회원가입 완료'}</button>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  )
}
