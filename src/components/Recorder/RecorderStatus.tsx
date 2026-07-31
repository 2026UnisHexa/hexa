type Props = {
  status: string
}

export function RecorderStatus({ status }: Props) {
  return <p>녹음 상태: {status}</p>
}
