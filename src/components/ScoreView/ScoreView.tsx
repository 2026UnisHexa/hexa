import { useEffect, useRef } from 'react'
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay'

type Props = {
  musicXml: string | null
  hasMelody?: boolean
  isPlayingMelody?: boolean
  onToggleMelody?: () => void
}

export function ScoreView({
  musicXml,
  hasMelody = false,
  isPlayingMelody = false,
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
    <section>
      <h2>2. 악보</h2>
      {onToggleMelody ? (
        <p>
          <button
            type="button"
            onClick={onToggleMelody}
            disabled={!hasMelody}
          >
            {isPlayingMelody
              ? '⏹ 정지'
              : '▶ 인식된 멜로디 듣기'}
          </button>
        </p>
      ) : null}
      {!musicXml ? <p>녹음 후 인식되면 여기에 오선보가 표시됩니다.</p> : null}
      <div ref={containerRef} />
    </section>
  )
}
