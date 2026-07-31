type Props = {
  melodyDisabled: boolean
  accompanimentDisabled: boolean
  playing: boolean
  onPlayMelody: () => void
  onPlayWithAccompaniment: () => void
  onStop: () => void
}

export function PlaybackControls({
  melodyDisabled,
  accompanimentDisabled,
  playing,
  onPlayMelody,
  onPlayWithAccompaniment,
  onStop,
}: Props) {
  return (
    <section>
      <h2>미리듣기</h2>
      <button
        type="button"
        onClick={onPlayMelody}
        disabled={melodyDisabled || playing}
      >
        {playing ? '⏸ 재생 중...' : '▶ 인식된 멜로디 듣기'}
      </button>{' '}
      <button
        type="button"
        onClick={onPlayWithAccompaniment}
        disabled={accompanimentDisabled || playing}
      >
        멜로디 + 반주 재생
      </button>{' '}
      <button type="button" onClick={onStop} disabled={!playing}>
        ⏹ 정지
      </button>
      {playing ? <p>재생 중…</p> : null}
    </section>
  )
}
