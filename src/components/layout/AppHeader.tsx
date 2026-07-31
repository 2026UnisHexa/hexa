type View = 'home' | 'create' | 'marketplace'

type Props = {
  view: View
  onNavigate: (view: View) => void
  showCreateNav?: boolean
}

export function AppHeader({ view, onNavigate, showCreateNav = true }: Props) {
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
          </>
        ) : null}
        <div className="app-header__avatar" aria-hidden="true">
          ME
        </div>
      </nav>
    </header>
  )
}
