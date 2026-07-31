import { useEffect, useState } from 'react'
import { RecorderStatus } from '../Recorder/RecorderStatus'
import { LoadingState } from '../common/LoadingState'
import { ErrorMessage } from '../common/ErrorMessage'
import { useRecorder } from '../../hooks/useRecorder'
import { useTranscribe } from '../../hooks/useTranscribe'

type Props = {
  text: string
  onTextChange: (value: string) => void
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

export function VoiceMemo({ text, onTextChange }: Props) {
  const recorder = useRecorder()
  const { loading, error: transcribeError, transcribe, reset } = useTranscribe()
  const [rawText, setRawText] = useState('')

  useEffect(() => {
    if (recorder.status !== 'stopped' || !recorder.audioBlob) return

    let cancelled = false
    void (async () => {
      const result = await transcribe(recorder.audioBlob!)
      if (cancelled) return
      setRawText(result.raw)
      onTextChange(result.refined || result.raw)
    })()

    return () => {
      cancelled = true
    }
  }, [recorder.status, recorder.audioBlob, transcribe, onTextChange])

  const recording = recorder.status === 'recording'

  return (
    <section className="voice-memo">
      <div className="panel">
        <p className="muted">
          말하면 텍스트로 바꿔 줍니다. 녹음이 끝나면 Whisper로 인식한 뒤 말더듬·반복만
          가볍게 다듬고, 아래에서 직접 수정할 수 있습니다.
        </p>
        <div className="record-stage">
          <div
            className={`record-stage__mic${recording ? ' is-recording' : ''}`}
            aria-hidden="true"
          >
            <MicIcon />
          </div>
          <span className="status-pill">
            <RecorderStatus status={recorder.status} />
          </span>
          {recorder.error ? (
            <p className="alert" role="alert">
              {recorder.error}
            </p>
          ) : null}
          <div className="btn-row">
            <button
              type="button"
              className="btn btn--primary btn--lg"
              onClick={() => {
                reset()
                onTextChange('')
                setRawText('')
                void recorder.start()
              }}
              disabled={recording || loading}
            >
              녹음 시작
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--lg"
              onClick={() => recorder.stop()}
              disabled={!recording || loading}
            >
              녹음 정지
            </button>
          </div>
        </div>
      </div>

      {loading ? <LoadingState message="음성을 텍스트로 변환 중…" /> : null}
      {transcribeError ? <ErrorMessage message={transcribeError} /> : null}

      <div className="panel voice-memo__result">
        <div className="field">
          <label htmlFor="voice-memo-text">변환된 텍스트</label>
          <textarea
            id="voice-memo-text"
            rows={8}
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="녹음 후 변환된 문장이 여기에 나타납니다. 직접 수정해도 됩니다."
            disabled={loading}
          />
        </div>
        {rawText && rawText !== text ? (
          <p className="muted voice-memo__raw">원문(Whisper): {rawText}</p>
        ) : null}
      </div>
    </section>
  )
}
