import type { MarketplaceListing } from '../../types/listing'

type Props = {
  listings: MarketplaceListing[]
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

export function MarketplaceView({ listings }: Props) {
  const mine = listings.filter((l) => l.mine)
  const others = listings.filter((l) => !l.mine)

  return (
    <section className="marketplace" data-node-id="6:73">
      <h1 className="marketplace__title">마켓플레이스</h1>
      <p className="muted">
        내가 올린 작품과 다른 사용자의 멜로디를 둘러볼 수 있어요.
      </p>

      <h2 className="marketplace__section-title">내가 올린 것 ({mine.length})</h2>
      {mine.length === 0 ? (
        <p className="muted">아직 등록한 작품이 없습니다. step 5에서 등록해 보세요.</p>
      ) : (
        <div className="marketplace__grid">
          {mine.map((item) => (
            <article key={item.id} className="market-card market-card--mine">
              <span className="market-card__badge">{item.genreLabel}</span>
              <h3>{item.title}</h3>
              <p className="market-card__price">{formatPrice(item.price)}</p>
              <p className="market-card__meta">
                {item.chordLabel ? `코드: ${item.chordLabel} · ` : null}
                노트 {item.noteCount}개 · {formatDate(item.createdAt)}
              </p>
            </article>
          ))}
        </div>
      )}

      {others.length > 0 ? (
        <>
          <h2 className="marketplace__section-title">둘러보기</h2>
          <div className="marketplace__grid">
            {others.map((item) => (
              <article key={item.id} className="market-card">
                <span className="market-card__badge">{item.genreLabel}</span>
                <h3>{item.title}</h3>
                <p className="market-card__price">{formatPrice(item.price)}</p>
                <p className="market-card__meta">
                  {item.chordLabel ? `코드: ${item.chordLabel}` : '샘플 작품'}
                </p>
              </article>
            ))}
          </div>
        </>
      ) : null}
    </section>
  )
}
