type Props = {
  disabled: boolean
  playing: boolean
  onPlayMelody: () => void
  onPlayWithAccompaniment: () => void
}

export function PlaybackControls({
  disabled,
  playing,
  onPlayMelody,
  onPlayWithAccompaniment,
}: Props) {
  return (
    <section>
      <h2>미리듣기</h2>
      <button type="button" onClick={onPlayMelody} disabled={disabled || playing}>
        멜로디 재생
      </button>{' '}
      <button
        type="button"
        onClick={onPlayWithAccompaniment}
        disabled={disabled || playing}
      >
        멜로디 + 반주 재생
      </button>
      {playing ? <p>재생 중…</p> : null}
    </section>
  )
}
