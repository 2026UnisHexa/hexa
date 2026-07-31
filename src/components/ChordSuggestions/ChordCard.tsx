import type { ChordSuggestion } from '../../types/chord'

type Props = {
  suggestion: ChordSuggestion
  selected: boolean
  onSelect: () => void
  onTogglePlay: () => void
  isPlaying: boolean
}

export function ChordCard({
  suggestion,
  selected,
  onSelect,
  onTogglePlay,
  isPlaying,
}: Props) {
  const chordNames = suggestion.chords.map((c) => c.name).join(' – ')

  return (
    <li>
      <div
        className={`chord-card${selected ? ' is-selected' : ''}`}
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onSelect()
          }
        }}
      >
        <div>
          <div className="chord-card__label">{suggestion.label}</div>
          <div className="chord-card__chords">{chordNames}</div>
        </div>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={(e) => {
            e.stopPropagation()
            onTogglePlay()
          }}
        >
          {isPlaying ? '정지' : '미리듣기'}
        </button>
      </div>
    </li>
  )
}
