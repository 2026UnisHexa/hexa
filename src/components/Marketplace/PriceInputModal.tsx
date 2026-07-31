import { useEffect, useRef } from 'react'

type Props = {
  open: boolean
  title: string
  price: string
  onTitleChange: (value: string) => void
  onPriceChange: (value: string) => void
  onSubmit: () => void
  onCancel: () => void
}

export function PriceInputModal({
  open,
  title,
  price,
  onTitleChange,
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
          작품이 마켓플레이스 목록에 추가됩니다. (이 기기에 저장)
        </p>
        <div className="field">
          <label htmlFor="listing-title">제목</label>
          <input
            id="listing-title"
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="예: 새벽 창가의 허밍"
            required
            maxLength={60}
          />
        </div>
        <div className="field">
          <label htmlFor="listing-price">가격 (원)</label>
          <input
            id="listing-price"
            type="number"
            min="0"
            step="100"
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
