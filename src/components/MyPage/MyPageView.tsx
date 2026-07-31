import type { MarketplaceListing } from '../../types/listing'
import type { UserProfile } from '../../types/user'

type Props = {
  profile: UserProfile
  listings: MarketplaceListing[]
  onProfileChange: (next: UserProfile) => void
  onDeleteListing: (id: string) => void
  onCreate: () => void
  onOpenMarketplace: () => void
  onLogout: () => void
}

function formatPrice(price: number): string {
  return `${price.toLocaleString('ko-KR')}원`
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return ''
  }
}

function initials(name: string): string {
  const t = name.trim()
  if (!t) return 'ME'
  return t.slice(0, 2).toUpperCase()
}

export function MyPageView({
  profile,
  listings,
  onProfileChange,
  onDeleteListing,
  onCreate,
  onOpenMarketplace,
  onLogout,
}: Props) {
  const mine = listings.filter((l) => l.mine)
  const totalValue = mine.reduce((sum, l) => sum + l.price, 0)

  return (
    <section className="mypage">
      <header className="mypage__hero">
        <div className="mypage__avatar" aria-hidden="true">
          {initials(profile.displayName || profile.loginId)}
        </div>
        <div className="mypage__hero-text">
          <p className="mypage__eyebrow">MY PAGE</p>
          <h1 className="mypage__title">
            {profile.displayName || profile.loginId}
          </h1>
          <p className="muted">@{profile.loginId}</p>
        </div>
        <div className="mypage__hero-actions">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={onOpenMarketplace}
          >
            마켓플레이스
          </button>
          <button type="button" className="btn btn--primary" onClick={onCreate}>
            새로 만들기
          </button>
        </div>
      </header>

      <div className="mypage__stats">
        <div className="mypage__stat">
          <span className="mypage__stat-label">등록 작품</span>
          <strong className="mypage__stat-value">{mine.length}</strong>
        </div>
        <div className="mypage__stat">
          <span className="mypage__stat-label">등록 총액</span>
          <strong className="mypage__stat-value">{formatPrice(totalValue)}</strong>
        </div>
        <div className="mypage__stat">
          <span className="mypage__stat-label">가입일</span>
          <strong className="mypage__stat-value">
            {formatDate(profile.joinedAt)}
          </strong>
        </div>
      </div>

      <div className="mypage__grid">
        <section className="panel mypage__profile">
          <h2>프로필</h2>
          <p className="muted">표시 이름과 소개를 이 기기에 저장합니다.</p>
          <div className="field">
            <label htmlFor="mypage-display-name">표시 이름</label>
            <input
              id="mypage-display-name"
              type="text"
              maxLength={40}
              value={profile.displayName}
              onChange={(e) =>
                onProfileChange({ ...profile, displayName: e.target.value })
              }
              placeholder="흥얼하는 사람"
            />
          </div>
          <div className="field">
            <label htmlFor="mypage-bio">소개</label>
            <textarea
              id="mypage-bio"
              rows={3}
              maxLength={160}
              value={profile.bio}
              onChange={(e) =>
                onProfileChange({ ...profile, bio: e.target.value })
              }
              placeholder="허밍으로 멜로디를 남겨요."
            />
          </div>
          <button type="button" className="btn btn--ghost" onClick={onLogout}>
            로그아웃
          </button>
        </section>

        <section className="panel mypage__works">
          <div className="mypage__works-head">
            <h2>내가 올린 작품</h2>
            <span className="muted">{mine.length}개</span>
          </div>
          {mine.length === 0 ? (
            <p className="muted">
              아직 등록한 작품이 없습니다. step 5에서 마켓에 올려 보세요.
            </p>
          ) : (
            <ul className="mypage__list">
              {mine.map((item) => (
                <li key={item.id} className="mypage__item">
                  <div>
                    <span className="market-card__badge">{item.genreLabel}</span>
                    <h3>{item.title}</h3>
                    <p className="market-card__meta">
                      {formatPrice(item.price)}
                      {item.chordLabel ? ` · ${item.chordLabel}` : ''}
                      {` · ${formatDate(item.createdAt)}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => onDeleteListing(item.id)}
                  >
                    삭제
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  )
}
