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
    <section>
      <h2>5. 미리듣기</h2>
      <button
        type="button"
        onClick={onToggleMelody}
        disabled={melodyDisabled || accompanimentActive}
      >
        {melodyActive ? '⏹ 정지' : '▶ 인식된 멜로디 듣기'}
      </button>{' '}
      <button
        type="button"
        onClick={onToggleWithAccompaniment}
        disabled={accompanimentDisabled || melodyActive}
      >
        {accompanimentActive ? '⏹ 정지' : '▶ 멜로디 + 반주 재생'}
      </button>
      {melodyActive ? <p>멜로디 재생 중…</p> : null}
      {accompanimentActive ? <p>멜로디 + 반주 재생 중…</p> : null}
    </section>
  )
}
