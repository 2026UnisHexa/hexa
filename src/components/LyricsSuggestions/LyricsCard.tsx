import { useState } from 'react'
import type { MouseEvent } from 'react'
import type { LyricsSuggestion } from '../../types/lyrics'

type Props = {
  suggestion: LyricsSuggestion
  selected: boolean
  onSelect: () => void
}

export function LyricsCard({ suggestion, selected, onSelect }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleCopy(e: MouseEvent) {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(
        `${suggestion.title}\n\n${suggestion.lyrics}`,
      )
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <li>
      <div
        className={`lyrics-card${selected ? ' is-selected' : ''}`}
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
        <div className="lyrics-card__body">
          <div className="lyrics-card__label">{suggestion.title}</div>
          <pre className="lyrics-card__lyrics">{suggestion.lyrics}</pre>
        </div>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={handleCopy}
        >
          {copied ? '복사됨' : '복사하기'}
        </button>
      </div>
    </li>
  )
}
