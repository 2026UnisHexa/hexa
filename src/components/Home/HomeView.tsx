type Props = {
  onOpenMarketplace: () => void
  onCreate: () => void
  onVoiceMemo: () => void
}

function MarketplaceIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 9h16l-1.2 10.2A2 2 0 0 1 16.81 21H7.19a2 2 0 0 1-1.99-1.8L4 9Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 9V7a4 4 0 0 1 8 0v2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function CreateIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 8.5v7M8.5 12h7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function VoiceIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="9"
        y="3"
        width="6"
        height="11"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M6 11a6 6 0 0 0 12 0M12 17v3M9 20h6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function HomeView({ onOpenMarketplace, onCreate, onVoiceMemo }: Props) {
  return (
    <section className="home" data-node-id="6:57">
      <div className="home__cards">
        <button type="button" className="home-card" onClick={onOpenMarketplace}>
          <span className="home-card__icon">
            <MarketplaceIcon />
          </span>
          <span className="home-card__label">마켓플레이스</span>
        </button>
        <button type="button" className="home-card" onClick={onCreate}>
          <span className="home-card__icon">
            <CreateIcon />
          </span>
          <span className="home-card__label">새로 만들기</span>
        </button>
        <button type="button" className="home-card" onClick={onVoiceMemo}>
          <span className="home-card__icon">
            <VoiceIcon />
          </span>
          <span className="home-card__label">말하기 → 텍스트</span>
        </button>
      </div>
    </section>
  )
}
