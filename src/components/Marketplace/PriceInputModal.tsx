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
    <dialog ref={ref} onClose={onCancel}>
      <form
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit()
        }}
      >
        <h3>마켓플레이스 등록 (컨셉 데모)</h3>
        <p>
          실제 결제/서버 연동은 없습니다. 데모용 UI입니다.
        </p>
        <label>
          가격 (원){' '}
          <input
            type="number"
            min="0"
            value={price}
            onChange={(e) => onPriceChange(e.target.value)}
            required
          />
        </label>
        <p>
          <button type="submit">등록</button>{' '}
          <button type="button" onClick={onCancel}>
            취소
          </button>
        </p>
      </form>
    </dialog>
  )
}
