import { RecorderStatus } from './RecorderStatus'

type Props = {
  status: string
  error: string | null
  onStart: () => void
  onStop: () => void
}

export function Recorder({ status, error, onStart, onStop }: Props) {
  return (
    <section>
      <h2>1. 허밍 녹음</h2>
      <p>
        단음으로, 마이크에 가까이 대고 녹음해 주세요. (화음/노이즈는 인식이
        떨어질 수 있습니다)
      </p>
      <RecorderStatus status={status} />
      {error ? <p role="alert">{error}</p> : null}
      <button type="button" onClick={onStart} disabled={status === 'recording'}>
        녹음 시작
      </button>{' '}
      <button type="button" onClick={onStop} disabled={status !== 'recording'}>
        녹음 정지
      </button>
    </section>
  )
}
