type Props = {
  disabled: boolean
  onDownloadMidi: () => void
  onDownloadMusicXml: () => void
}

function FileIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 3.5h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9.5A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M14 3.5V8h4.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

export function DownloadButtons({
  disabled,
  onDownloadMidi,
  onDownloadMusicXml,
}: Props) {
  return (
    <>
      <button
        type="button"
        className="download-card"
        onClick={onDownloadMidi}
        disabled={disabled}
      >
        <span className="download-card__icon">
          <FileIcon />
        </span>
        MIDI
      </button>
      <button
        type="button"
        className="download-card"
        onClick={onDownloadMusicXml}
        disabled={disabled}
      >
        <span className="download-card__icon">
          <FileIcon />
        </span>
        MusicXML
      </button>
    </>
  )
}
