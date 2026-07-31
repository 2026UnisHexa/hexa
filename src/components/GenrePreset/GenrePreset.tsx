import type { GenreId } from '../../types/genre'
import { GENRE_PRESETS } from '../../lib/presets'

type Props = {
  value: GenreId
  onChange: (id: GenreId) => void
}

export function GenrePreset({ value, onChange }: Props) {
  return (
    <section>
      <h2>4. 장르 프리셋</h2>
      <label>
        장르{' '}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as GenreId)}
        >
          {GENRE_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label} ({p.pattern})
            </option>
          ))}
        </select>
      </label>
    </section>
  )
}
