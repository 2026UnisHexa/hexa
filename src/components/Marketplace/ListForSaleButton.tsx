type Props = {
  disabled: boolean
  onClick: () => void
}

export function ListForSaleButton({ disabled, onClick }: Props) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}>
      마켓플레이스에 등록
    </button>
  )
}
