import type { ChordSuggestion } from '../../types/chord'
import { ChordCard } from './ChordCard'

type Props = {
  suggestions: ChordSuggestion[]
  selectedIndex: number
  loading: boolean
  onSelect: (index: number) => void
  onPlay: (index: number) => void
  onStop: () => void
  playing: boolean
  playDisabled: boolean
}

export function ChordSuggestions({
  suggestions,
  selectedIndex,
  loading,
  onSelect,
  onPlay,
  onStop,
  playing,
  playDisabled,
}: Props) {
  return (
    <section>
      <h2>3. 코드 진행 제안</h2>
      {loading ? <p>OpenAI에 코드 진행을 요청하는 중…</p> : null}
      {suggestions.length === 0 && !loading ? (
        <p>멜로디 인식 후 자동으로 제안됩니다.</p>
      ) : null}
      {suggestions.length > 0 ? (
        <p>
          <button type="button" onClick={onStop} disabled={!playing}>
            ⏹ 정지
          </button>
          {playing ? ' 재생 중…' : null}
        </p>
      ) : null}
      <ul>
        {suggestions.map((s, i) => (
          <ChordCard
            key={`${s.label}-${i}`}
            suggestion={s}
            selected={selectedIndex === i}
            onSelect={() => onSelect(i)}
            onPlay={() => onPlay(i)}
            playDisabled={playDisabled}
          />
        ))}
      </ul>
    </section>
  )
}
