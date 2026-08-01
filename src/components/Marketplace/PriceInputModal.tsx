import { useEffect, useRef } from 'react'

export type ListingAudioMode = 'melody' | 'composition'

type Props = {
  open: boolean
  title: string
  price: string
  audioMode: ListingAudioMode
  saving?: boolean
  error?: string | null
  onTitleChange: (value: string) => void
  onPriceChange: (value: string) => void
  onAudioModeChange: (value: ListingAudioMode) => void
  onSubmit: () => void
  onCancel: () => void
}

export function PriceInputModal({
  open,
  title,
  price,
  audioMode,
  saving = false,
  error = null,
  onTitleChange,
  onPriceChange,
  onAudioModeChange,
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
          if (!saving) onSubmit()
        }}
      >
        <h2>마켓플레이스 등록</h2>
        <p className="muted">
          서버에 음원 파일을 올리고 내 작품 목록에 추가합니다.
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
            disabled={saving}
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
            disabled={saving}
          />
        </div>
        <div className="field">
          <label htmlFor="listing-audio-mode">등록할 음원</label>
          <select
            id="listing-audio-mode"
            value={audioMode}
            onChange={(e) =>
              onAudioModeChange(e.target.value as ListingAudioMode)
            }
            disabled={saving}
          >
            <option value="melody">멜로디만</option>
            <option value="composition">멜로디 + 반주</option>
          </select>
        </div>
        {error ? (
          <p className="alert" role="alert">
            {error}
          </p>
        ) : null}
        <div className="modal__actions">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={onCancel}
            disabled={saving}
          >
            취소
          </button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? '업로드 중…' : '등록'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
