type Props = {
  melodyDisabled: boolean
  accompanimentDisabled: boolean
  playing: boolean
  onToggleMelody: () => void
  onToggleWithAccompaniment: () => void
}

export function PlaybackControls({
  melodyDisabled,
  accompanimentDisabled,
  playing,
  onToggleMelody,
  onToggleWithAccompaniment,
}: Props) {
  return (
    <section>
      <h2>미리듣기</h2>
      <button
        type="button"
        onClick={onToggleMelody}
        disabled={melodyDisabled}
      >
        {playing ? '⏹ 정지' : '▶ 인식된 멜로디 듣기'}
      </button>{' '}
      <button
        type="button"
        onClick={onToggleWithAccompaniment}
        disabled={accompanimentDisabled && !playing}
      >
        {playing ? '⏹ 정지' : '멜로디 + 반주 재생'}
      </button>
      {playing ? <p>재생 중…</p> : null}
    </section>
  )
}
