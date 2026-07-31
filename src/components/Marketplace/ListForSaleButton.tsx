type Props = {
  disabled: boolean
  onClick: () => void
}

export function ListForSaleButton({ disabled, onClick }: Props) {
  return (
    <button
      type="button"
      className="download-card"
      onClick={onClick}
      disabled={disabled}
      style={{ flex: '1.4' }}
    >
      <span className="download-card__icon" aria-hidden="true">
        ★
      </span>
      마켓 등록
    </button>
  )
}
