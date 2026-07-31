import { useEffect, useRef } from 'react'

type Props = {
  open: boolean
  price: string
  onClose: () => void
}

export function ListingSuccessModal({ open, price, onClose }: Props) {
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
        {price}원으로 등록된 것처럼 보이는 컨셉 데모입니다.
      </p>
      <div className="modal__actions">
        <button type="button" className="btn btn--primary" onClick={onClose}>
          닫기
        </button>
      </div>
    </dialog>
  )
}
