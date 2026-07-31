import type { ChordSuggestion } from '../../types/chord'

type Props = {
  suggestion: ChordSuggestion
  selected: boolean
  onSelect: () => void
  onPlay: () => void
  playDisabled: boolean
}

export function ChordCard({
  suggestion,
  selected,
  onSelect,
  onPlay,
  playDisabled,
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
        <button type="button" onClick={onPlay} disabled={playDisabled}>
          ▶
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
