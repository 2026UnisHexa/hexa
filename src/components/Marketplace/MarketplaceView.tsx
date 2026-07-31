const DEMO_LISTINGS = [
  {
    id: '1',
    title: '새벽 창가의 허밍',
    genre: 'Ballad',
    price: '1,200P',
  },
  {
    id: '2',
    title: '비 오는 날의 리프',
    genre: 'Jazz',
    price: '2,000P',
  },
  {
    id: '3',
    title: '버스 정류장 멜로디',
    genre: 'Pop',
    price: '900P',
  },
]

type Props = {
  onCreate: () => void
}

export function MarketplaceView({ onCreate }: Props) {
  return (
    <section className="marketplace" data-node-id="6:73">
      <h1 className="marketplace__title">마켓플레이스</h1>
      <p className="muted">
        다른 사용자의 멜로디를 둘러보거나, 내 작품을 등록할 수 있어요. (현재는
        더미 데이터)
      </p>
      <div className="btn-row">
        <button type="button" className="btn btn--primary" onClick={onCreate}>
          새로 만들기
        </button>
      </div>
      <div className="marketplace__grid">
        {DEMO_LISTINGS.map((item) => (
          <article key={item.id} className="market-card">
            <span className="market-card__badge">{item.genre}</span>
            <h3>{item.title}</h3>
            <p>{item.price}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
