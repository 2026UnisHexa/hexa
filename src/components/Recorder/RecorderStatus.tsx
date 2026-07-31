type Props = {
  status: string
}

export function RecorderStatus({ status }: Props) {
  return <span>녹음 상태: {status}</span>
}
