import type { PlaybackMode } from '../../hooks/usePlayback'

type Props = {
  melodyDisabled: boolean
  accompanimentDisabled: boolean
  mode: PlaybackMode
  onToggleMelody: () => void
  onToggleWithAccompaniment: () => void
}

export function PlaybackControls({
  melodyDisabled,
  accompanimentDisabled,
  mode,
  onToggleMelody,
  onToggleWithAccompaniment,
}: Props) {
  const melodyActive = mode === 'melody'
  const accompanimentActive = mode === 'accompaniment'

  return (
    <div className="panel" style={{ marginBottom: 20 }}>
      <p className="muted">멜로디만, 또는 반주와 함께 미리들어 보세요.</p>
      <div className="btn-row">
        <button
          type="button"
          className="btn btn--secondary"
          onClick={onToggleMelody}
          disabled={melodyDisabled || accompanimentActive}
        >
          {melodyActive ? '정지' : '멜로디 듣기'}
        </button>
        <button
          type="button"
          className="btn btn--primary"
          onClick={onToggleWithAccompaniment}
          disabled={accompanimentDisabled || melodyActive}
        >
          {accompanimentActive ? '정지' : '멜로디 + 반주'}
        </button>
      </div>
      {melodyActive ? <p className="muted">멜로디 재생 중…</p> : null}
      {accompanimentActive ? (
        <p className="muted">멜로디 + 반주 재생 중…</p>
      ) : null}
    </div>
  )
}
