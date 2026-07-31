type View = 'home' | 'create' | 'marketplace' | 'mypage'

type Props = {
  view: View
  onNavigate: (view: View) => void
  showCreateNav?: boolean
  avatarLabel?: string
}

export function AppHeader({
  view,
  onNavigate,
  showCreateNav = true,
  avatarLabel = 'ME',
}: Props) {
  return (
    <header className="app-header">
      <button
        type="button"
        className="app-header__brand"
        onClick={() => onNavigate('home')}
        aria-label="흥얼 홈"
      >
        흥얼
      </button>

      <nav className="app-header__nav" aria-label="주요 메뉴">
        {view !== 'home' ? (
          <>
            <button
              type="button"
              className={`app-header__link${view === 'marketplace' ? ' is-active' : ''}`}
              onClick={() => onNavigate('marketplace')}
            >
              마켓플레이스
            </button>
            {showCreateNav ? (
              <button
                type="button"
                className={`app-header__link${view === 'create' ? ' is-active' : ''}`}
                onClick={() => onNavigate('create')}
              >
                새로 만들기
              </button>
            ) : null}
            <button
              type="button"
              className={`app-header__link${view === 'mypage' ? ' is-active' : ''}`}
              onClick={() => onNavigate('mypage')}
            >
              마이페이지
            </button>
          </>
        ) : null}
        <button
          type="button"
          className={`app-header__avatar${view === 'mypage' ? ' is-active' : ''}`}
          onClick={() => onNavigate('mypage')}
          aria-label="마이페이지"
        >
          {avatarLabel}
        </button>
      </nav>
    </header>
  )
}
