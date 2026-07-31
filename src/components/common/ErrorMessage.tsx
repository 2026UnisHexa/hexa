type Props = {
  message: string
}

export function ErrorMessage({ message }: Props) {
  return (
    <p className="alert" role="alert">
      {message}
    </p>
  )
}
