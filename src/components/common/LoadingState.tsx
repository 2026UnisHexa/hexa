type Props = {
  message: string
}

export function LoadingState({ message }: Props) {
  return <p className="status-pill">{message}</p>
}
