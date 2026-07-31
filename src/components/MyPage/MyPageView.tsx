import { useEffect, useState } from 'react'
import type { MarketplaceListing } from '../../types/listing'
import type { UserProfile } from '../../types/user'
import {
  playListingPreview,
  stopListingPreview,
} from '../../lib/listingPreview'

type Props = {
  profile: UserProfile
  listings: MarketplaceListing[]
  onProfileChange: (next: UserProfile) => void
  onUpdateListingPrice: (id: string, price: number) => void
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

function ListingPriceEditor({
  listingId,
  price,
  onSave,
}: {
  listingId: string
  price: number
  onSave: (price: number) => void
}) {
  const [value, setValue] = useState(String(price))

  useEffect(() => {
    setValue(String(price))
  }, [price])

  const parsed = Number(value)
  const nextPrice = Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : null
  const canSave = nextPrice !== null && nextPrice !== price

  return (
    <div className="mypage__price-edit">
      <label htmlFor={`mypage-price-${listingId}`}>가격</label>
      <input
        id={`mypage-price-${listingId}`}
        type="number"
        min={0}
        step={100}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && canSave && nextPrice !== null) {
            e.preventDefault()
            onSave(nextPrice)
          }
        }}
      />
      <span className="muted">원</span>
      <button
        type="button"
        className="btn btn--secondary"
        disabled={!canSave}
        onClick={() => {
          if (nextPrice === null) return
          onSave(nextPrice)
        }}
      >
        저장
      </button>
    </div>
  )
}

export function MyPageView({
  profile,
  listings,
  onProfileChange,
  onUpdateListingPrice,
  onDeleteListing,
  onCreate,
  onOpenMarketplace,
  onLogout,
}: Props) {
  const mine = listings
  const totalValue = mine.reduce((sum, l) => sum + l.price, 0)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      stopListingPreview()
    }
  }, [])

  async function togglePlay(item: MarketplaceListing) {
    if (playingId === item.id) {
      stopListingPreview()
      setPlayingId(null)
      setLoadingId(null)
      return
    }

    stopListingPreview()
    setPlayingId(null)
    setLoadingId(item.id)
    try {
      setPlayingId(item.id)
      await playListingPreview(item)
    } catch (err) {
      console.warn('[MyPageView] preview failed', err)
    } finally {
      setLoadingId(null)
      setPlayingId((current) => (current === item.id ? null : current))
    }
  }

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
              {mine.map((item) => {
                const playing = playingId === item.id
                const loading = loadingId === item.id
                return (
                  <li key={item.id} className="mypage__item">
                    <div className="mypage__item-main">
                      <span className="market-card__badge">{item.genreLabel}</span>
                      <h3>{item.title}</h3>
                      <p className="market-card__meta">
                        {item.chordLabel ? `${item.chordLabel} · ` : ''}
                        {item.tempoBpm} BPM · {formatDate(item.createdAt)}
                      </p>
                      <ListingPriceEditor
                        listingId={item.id}
                        price={item.price}
                        onSave={(price) => onUpdateListingPrice(item.id, price)}
                      />
                      <div className="mypage__item-actions">
                        <button
                          type="button"
                          className={`btn ${playing ? 'btn--secondary' : 'btn--primary'}`}
                          onClick={() => void togglePlay(item)}
                          disabled={loading && !playing}
                        >
                          {loading && !playing
                            ? '준비 중…'
                            : playing
                              ? '정지'
                              : '미리듣기'}
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() => {
                            if (playingId === item.id) {
                              stopListingPreview()
                              setPlayingId(null)
                            }
                            onDeleteListing(item.id)
                          }}
                        >
                          삭제
                        </button>
                      </div>
                      <p className="muted mypage__preview-hint">
                        데모 미리듣기 (실제 녹음 파일은 저장되지 않음)
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </section>
  )
}
