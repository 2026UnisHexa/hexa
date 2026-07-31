import type { ChordSuggestion } from '../../types/chord'
import { ChordCard } from './ChordCard'

type Props = {
  suggestions: ChordSuggestion[]
  selectedIndex: number
  loading: boolean
  playingIndex: number | null
  onSelect: (index: number) => void
  onTogglePlay: (index: number) => void
}

export function ChordSuggestions({
  suggestions,
  selectedIndex,
  loading,
  playingIndex,
  onSelect,
  onTogglePlay,
}: Props) {
  return (
    <section>
      <h2>3. 코드 진행 제안</h2>
      {loading ? <p>OpenAI에 코드 진행을 요청하는 중…</p> : null}
      {suggestions.length === 0 && !loading ? (
        <p>멜로디 인식 후 자동으로 제안됩니다.</p>
      ) : null}
      <ul>
        {suggestions.map((s, i) => (
          <ChordCard
            key={`${s.label}-${i}`}
            suggestion={s}
            selected={selectedIndex === i}
            onSelect={() => onSelect(i)}
            onTogglePlay={() => onTogglePlay(i)}
            isPlaying={playingIndex === i}
          />
        ))}
      </ul>
    </section>
  )
}
