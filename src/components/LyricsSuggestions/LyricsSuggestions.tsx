import type { LyricsSuggestion } from '../../types/lyrics'
import { LyricsCard } from './LyricsCard'

type Props = {
  suggestions: LyricsSuggestion[]
  selectedIndex: number
  loading: boolean
  onSelect: (index: number) => void
}

export function LyricsSuggestions({
  suggestions,
  selectedIndex,
  loading,
  onSelect,
}: Props) {
  return (
    <div className="panel">
      {loading ? (
        <p className="muted">OpenAI에 가사 작성을 요청하는 중…</p>
      ) : null}
      {suggestions.length === 0 && !loading ? (
        <p className="muted">텍스트 변환 후 가사를 제안받을 수 있습니다.</p>
      ) : null}
      <ul className="lyrics-list">
        {suggestions.map((s, i) => (
          <LyricsCard
            key={`${s.title}-${i}`}
            suggestion={s}
            selected={selectedIndex === i}
            onSelect={() => onSelect(i)}
          />
        ))}
      </ul>
    </div>
  )
}
