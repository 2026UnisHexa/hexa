import { useEffect, useState } from 'react'
import type { MarketplaceListing } from '../../types/listing'
import { isOwnedBy } from '../../types/listing'
import {
  playListingPreview,
  stopListingPreview,
} from '../../lib/listingPreview'

type Props = {
  listings: MarketplaceListing[]
  currentLoginId: string
}

function formatPrice(price: number): string {
  return `${price.toLocaleString('ko-KR')}원`
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function ListingCard({
  item,
  mine,
  playing,
  loading,
  onToggle,
}: {
  item: MarketplaceListing
  mine?: boolean
  playing: boolean
  loading: boolean
  onToggle: () => void
}) {
  return (
    <article
      className={`market-card${mine ? ' market-card--mine' : ''}${playing ? ' is-playing' : ''}`}
    >
      <span className="market-card__badge">{item.genreLabel}</span>
      <h3>{item.title}</h3>
      <p className="market-card__price">{formatPrice(item.price)}</p>
      <p className="market-card__meta">
        {item.chordLabel ? `코드: ${item.chordLabel} · ` : null}
        {item.tempoBpm} BPM
        {mine ? ` · 노트 ${item.noteCount}개 · ${formatDate(item.createdAt)}` : null}
      </p>
      <div className="market-card__actions">
        <button
          type="button"
          className={`btn ${playing ? 'btn--secondary' : 'btn--primary'}`}
          onClick={onToggle}
          disabled={loading && !playing}
        >
          {loading && !playing ? '준비 중…' : playing ? '정지' : '미리듣기'}
        </button>
      </div>
    </article>
  )
}

export function MarketplaceView({ listings, currentLoginId }: Props) {
  const mine = listings.filter((l) => isOwnedBy(l, currentLoginId))
  const others = listings.filter((l) => !isOwnedBy(l, currentLoginId))
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
      console.warn('[MarketplaceView] preview failed', err)
    } finally {
      setLoadingId(null)
      setPlayingId((current) => (current === item.id ? null : current))
    }
  }

  return (
    <section className="marketplace" data-node-id="6:73">
      <h1 className="marketplace__title">마켓플레이스</h1>
      <p className="muted">
        카드에서 등록된 음원을 미리 들어볼 수 있어요.
      </p>

      <h2 className="marketplace__section-title">내가 올린 것 ({mine.length})</h2>
      {mine.length === 0 ? (
        <p className="muted">아직 등록한 작품이 없습니다. step 5에서 등록해 보세요.</p>
      ) : (
        <div className="marketplace__grid">
          {mine.map((item) => (
            <ListingCard
              key={item.id}
              item={item}
              mine
              playing={playingId === item.id}
              loading={loadingId === item.id}
              onToggle={() => void togglePlay(item)}
            />
          ))}
        </div>
      )}

      {others.length > 0 ? (
        <>
          <h2 className="marketplace__section-title">둘러보기</h2>
          <div className="marketplace__grid">
            {others.map((item) => (
              <ListingCard
                key={item.id}
                item={item}
                playing={playingId === item.id}
                loading={loadingId === item.id}
                onToggle={() => void togglePlay(item)}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  )
}
