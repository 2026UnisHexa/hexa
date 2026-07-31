import { RecorderStatus } from './RecorderStatus'

type Props = {
  status: string
  error: string | null
  onStart: () => void
  onStop: () => void
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="9"
        y="3"
        width="6"
        height="11"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M6 11a6 6 0 0 0 12 0M12 17v3M9 20h6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function Recorder({ status, error, onStart, onStop }: Props) {
  const recording = status === 'recording'

  return (
    <div className="panel">
      <p className="muted">
        단음으로, 마이크에 가까이 대고 녹음해 주세요. 녹음 후 잡음 제거 → 짧은 음
        병합 → 조성 추정 → 스케일 밖 노이즈음 보정을 거친 뒤 악보·멜로디를 만듭니다.
      </p>
      <div className="record-stage">
        <div
          className={`record-stage__mic${recording ? ' is-recording' : ''}`}
          aria-hidden="true"
        >
          <MicIcon />
        </div>
        <span className="status-pill">
          <RecorderStatus status={status} />
        </span>
        {error ? (
          <p className="alert" role="alert">
            {error}
          </p>
        ) : null}
        <div className="btn-row">
          <button
            type="button"
            className="btn btn--primary btn--lg"
            onClick={onStart}
            disabled={recording}
          >
            녹음 시작
          </button>
          <button
            type="button"
            className="btn btn--secondary btn--lg"
            onClick={onStop}
            disabled={!recording}
          >
            녹음 정지
          </button>
        </div>
      </div>
    </div>
  )
}
