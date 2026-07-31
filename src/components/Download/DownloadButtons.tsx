type Props = {
  disabled: boolean
  onDownloadMidi: () => void
  onDownloadMusicXml: () => void
}

export function DownloadButtons({
  disabled,
  onDownloadMidi,
  onDownloadMusicXml,
}: Props) {
  return (
    <section>
      <h2>5. 다운로드</h2>
      <button type="button" onClick={onDownloadMidi} disabled={disabled}>
        MIDI 다운로드
      </button>{' '}
      <button type="button" onClick={onDownloadMusicXml} disabled={disabled}>
        MusicXML 다운로드
      </button>
    </section>
  )
}
