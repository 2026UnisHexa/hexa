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
    <dialog ref={ref} onClose={onClose}>
      <h3>등록 완료</h3>
      <p>
        {price}원으로 등록된 것처럼 보이는 컨셉 데모입니다. 실제 결제는 Stripe
        연동으로 확장 가능합니다.
      </p>
      <button type="button" onClick={onClose}>
        닫기
      </button>
    </dialog>
  )
}
