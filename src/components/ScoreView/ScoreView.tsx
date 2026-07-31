import { useEffect, useRef } from 'react'
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay'
import {
  INSTRUMENT_OPTIONS,
  type InstrumentId,
} from '../../lib/instruments'

type Props = {
  musicXml: string | null
  hasMelody?: boolean
  isPlayingMelody?: boolean
  instrumentLoading?: boolean
  selectedInstrument?: InstrumentId
  onInstrumentChange?: (id: InstrumentId) => void
  onToggleMelody?: () => void
}

export function ScoreView({
  musicXml,
  hasMelody = false,
  isPlayingMelody = false,
  instrumentLoading = false,
  selectedInstrument = 'piano',
  onInstrumentChange,
  onToggleMelody,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null)

  useEffect(() => {
    if (!musicXml || !containerRef.current) return

    const xml = musicXml
    let cancelled = false

    async function render() {
      const el = containerRef.current
      if (!el) return
      el.replaceChildren()

      try {
        const osmd =
          osmdRef.current ??
          new OpenSheetMusicDisplay(el, {
            autoResize: true,
            drawTitle: false,
          })
        osmdRef.current = osmd
        await osmd.load(xml)
        if (cancelled) return
        osmd.render()
      } catch (err) {
        console.error('[ScoreView]', err)
        if (el) {
          el.textContent =
            '악보 렌더링에 실패했습니다. MusicXML은 다운로드로 확인하세요.'
        }
      }
    }

    void render()
    return () => {
      cancelled = true
    }
  }, [musicXml])

  return (
    <div className="panel">
      {onToggleMelody ? (
        <div className="btn-row" style={{ marginBottom: 16 }}>
          <button
            type="button"
            className="btn btn--primary"
            onClick={onToggleMelody}
            disabled={!hasMelody || instrumentLoading}
          >
            {instrumentLoading
              ? '악기 로딩 중…'
              : isPlayingMelody
                ? '정지'
                : '인식된 멜로디 듣기'}
          </button>
          {onInstrumentChange ? (
            <div className="field" style={{ marginBottom: 0, minWidth: 160 }}>
              <label htmlFor="instrument-select">악기</label>
              <select
                id="instrument-select"
                value={selectedInstrument}
                onChange={(e) =>
                  onInstrumentChange(e.target.value as InstrumentId)
                }
              >
                {INSTRUMENT_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      ) : null}
      {!musicXml ? (
        <p className="muted">녹음 후 인식되면 여기에 오선보가 표시됩니다.</p>
      ) : null}
      <div className="score-canvas" ref={containerRef} />
    </div>
  )
}
