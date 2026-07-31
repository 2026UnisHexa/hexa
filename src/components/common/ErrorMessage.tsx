type Props = {
  message: string
}

export function ErrorMessage({ message }: Props) {
  return <p role="alert">{message}</p>
}
