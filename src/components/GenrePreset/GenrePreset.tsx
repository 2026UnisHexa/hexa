import type { GenreId } from '../../types/genre'
import { GENRE_PRESETS } from '../../lib/presets'

type Props = {
  value: GenreId
  onChange: (id: GenreId) => void
}

export function GenrePreset({ value, onChange }: Props) {
  return (
    <div className="panel">
      <p className="muted">
        장르 프리셋을 고르면 반주 패턴이 바뀝니다. step 5에서 함께 미리들을 수
        있어요.
      </p>
      <div className="field">
        <label htmlFor="genre-select">장르</label>
        <select
          id="genre-select"
          value={value}
          onChange={(e) => onChange(e.target.value as GenreId)}
        >
          {GENRE_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label} ({p.pattern})
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
