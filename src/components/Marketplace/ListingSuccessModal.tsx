import { useEffect, useRef } from 'react'

type Props = {
  open: boolean
  title: string
  price: string
  onClose: () => void
  onGoToMarketplace: () => void
}

export function ListingSuccessModal({
  open,
  title,
  price,
  onClose,
  onGoToMarketplace,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog ref={ref} className="modal" onClose={onClose}>
      <h2>등록 완료</h2>
      <p className="muted">
        「{title}」이(가) {Number(price).toLocaleString('ko-KR')}원으로
        마켓플레이스에 등록되었습니다.
      </p>
      <div className="modal__actions">
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          닫기
        </button>
        <button
          type="button"
          className="btn btn--primary"
          onClick={onGoToMarketplace}
        >
          마켓에서 보기
        </button>
      </div>
    </dialog>
  )
}
