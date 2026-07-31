import { useEffect, useRef } from 'react'

type Props = {
  open: boolean
  price: string
  onPriceChange: (value: string) => void
  onSubmit: () => void
  onCancel: () => void
}

export function PriceInputModal({
  open,
  price,
  onPriceChange,
  onSubmit,
  onCancel,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog ref={ref} className="modal" onClose={onCancel}>
      <form
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit()
        }}
      >
        <h2>마켓플레이스 등록</h2>
        <p className="muted">
          실제 결제/서버 연동은 없습니다. 데모용 UI입니다.
        </p>
        <div className="field">
          <label htmlFor="listing-price">가격 (원)</label>
          <input
            id="listing-price"
            type="number"
            min="0"
            value={price}
            onChange={(e) => onPriceChange(e.target.value)}
            required
          />
        </div>
        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            취소
          </button>
          <button type="submit" className="btn btn--primary">
            등록
          </button>
        </div>
      </form>
    </dialog>
  )
}
