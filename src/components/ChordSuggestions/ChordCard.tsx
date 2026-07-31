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
      <label>
        <input
          type="radio"
          name="chord-suggestion"
          checked={selected}
          onChange={onSelect}
        />{' '}
        <strong>{suggestion.label}</strong>
      </label>
      <div>
        {chordNames}{' '}
        <button type="button" onClick={onTogglePlay}>
          {isPlaying ? '⏹' : '▶'}
        </button>
      </div>
      <ul>
        {suggestion.chords.map((c) => (
          <li key={`${suggestion.label}-${c.name}-${c.notes.join('.')}`}>
            {c.name}: {c.notes.join(', ')}
          </li>
        ))}
      </ul>
    </li>
  )
}
