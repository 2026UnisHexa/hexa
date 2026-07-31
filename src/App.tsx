import { useEffect, useMemo, useRef, useState } from 'react'
import { Recorder } from './components/Recorder/Recorder'
import { ScoreView } from './components/ScoreView/ScoreView'
import { PlaybackControls } from './components/Playback/PlaybackControls'
import { ChordSuggestions } from './components/ChordSuggestions/ChordSuggestions'
import { GenrePreset } from './components/GenrePreset/GenrePreset'
import { DownloadButtons } from './components/Download/DownloadButtons'
import { ListForSaleButton } from './components/Marketplace/ListForSaleButton'
import { PriceInputModal } from './components/Marketplace/PriceInputModal'
import { ListingSuccessModal } from './components/Marketplace/ListingSuccessModal'
import { LoadingState } from './components/common/LoadingState'
import { ErrorMessage } from './components/common/ErrorMessage'
import { useRecorder } from './hooks/useRecorder'
import { useBasicPitch } from './hooks/useBasicPitch'
import { useChordPlayback, usePlayback } from './hooks/usePlayback'
import { suggestChordProgressions } from './lib/claude'
import { melodyNotesToMusicXml } from './lib/midiToMusicXml'
import { downloadBlob, melodyNotesToMidiBlob } from './lib/midiDownload'
import { getGenrePreset } from './lib/presets'
import { estimateTempoBpm, summarizeMelody } from './utils/melodySummary'
import type { ChordSuggestion } from './types/chord'
import type { GenreId } from './types/genre'

export default function App() {
  const recorder = useRecorder()
  const pitch = useBasicPitch()
  const playback = usePlayback()
  const chordPlayback = useChordPlayback()

  const [suggestions, setSuggestions] = useState<ChordSuggestion[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [genreId, setGenreId] = useState<GenreId>('pop')
  const [priceOpen, setPriceOpen] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const [price, setPrice] = useState('1000')
  const [pipelineError, setPipelineError] = useState<string | null>(null)
  const processedBlobRef = useRef<Blob | null>(null)

  const tempoBpm = useMemo(
    () => estimateTempoBpm(pitch.notes),
    [pitch.notes],
  )

  const musicXml = useMemo(() => {
    if (pitch.notes.length === 0) return null
    return melodyNotesToMusicXml(pitch.notes, tempoBpm)
  }, [pitch.notes, tempoBpm])

  const selectedSuggestion = suggestions[selectedIndex] ?? null
  const genrePreset = getGenrePreset(genreId)
  const hasMelody = pitch.notes.length > 0

  useEffect(() => {
    if (recorder.status !== 'stopped' || !recorder.audioBlob) return
    if (processedBlobRef.current === recorder.audioBlob) return
    processedBlobRef.current = recorder.audioBlob

    const blob = recorder.audioBlob
    let cancelled = false

    async function run() {
      setPipelineError(null)
      setSuggestions([])
      setSelectedIndex(0)

      const notes = await pitch.transcribe(blob)
      if (cancelled || notes.length === 0) return

      setSuggestLoading(true)
      try {
        const summary = summarizeMelody(notes, estimateTempoBpm(notes))
        console.log('[App] melody summary', summary)
        const result = await suggestChordProgressions(summary)
        if (!cancelled) {
          setSuggestions(result)
          setSelectedIndex(0)
          console.log('[App] chord suggestions', result)
        }
      } catch (err) {
        console.error('[App] suggest failed', err)
        if (!cancelled) {
          setPipelineError(
            '코드 제안 요청에 실패했습니다. fallback이 적용됐을 수 있습니다.',
          )
        }
      } finally {
        if (!cancelled) setSuggestLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [recorder.status, recorder.audioBlob, pitch.transcribe])

  return (
    <main>
      <header>
        <h1>Hexa</h1>
        <p>허밍 → 악보 변환 + AI 작곡 보조 (기능 테스트용, 스타일 없음)</p>
      </header>

      <Recorder
        status={recorder.status}
        error={recorder.error}
        onStart={() => {
          processedBlobRef.current = null
          void recorder.start()
        }}
        onStop={recorder.stop}
      />

      {pitch.loading ? (
        <LoadingState
          message={`Basic Pitch 인식 중… ${pitch.progress}% (콘솔에서 MIDI 노트 확인)`}
        />
      ) : null}
      {pitch.error ? <ErrorMessage message={pitch.error} /> : null}
      {pipelineError ? <ErrorMessage message={pipelineError} /> : null}

      {hasMelody ? (
        <p>
          인식된 노트 {pitch.notes.length}개 · 추정 템포 {tempoBpm} BPM · 요약:{' '}
          {summarizeMelody(pitch.notes, tempoBpm)}
        </p>
      ) : null}

      <ScoreView
        musicXml={musicXml}
        hasMelody={hasMelody}
        playing={playback.playing}
        onPlayMelody={() => void playback.playNotes(pitch.notes)}
        onStop={playback.stop}
      />

      <ChordSuggestions
        suggestions={suggestions}
        selectedIndex={selectedIndex}
        loading={suggestLoading}
        onSelect={setSelectedIndex}
        onPlay={(i) => {
          const s = suggestions[i]
          if (!s) return
          void chordPlayback.play(s.chords, genrePreset.chordDurationSeconds)
        }}
        playDisabled={chordPlayback.playing}
      />

      <GenrePreset value={genreId} onChange={setGenreId} />

      <PlaybackControls
        melodyDisabled={!hasMelody}
        accompanimentDisabled={!hasMelody || !selectedSuggestion}
        playing={playback.playing}
        onPlayMelody={() => void playback.playNotes(pitch.notes)}
        onPlayWithAccompaniment={() => {
          if (!selectedSuggestion) return
          void playback.playWithAccompaniment(
            pitch.notes,
            selectedSuggestion.chords,
            genrePreset,
          )
        }}
        onStop={playback.stop}
      />

      <DownloadButtons
        disabled={!hasMelody || !musicXml}
        onDownloadMidi={() => {
          const blob = melodyNotesToMidiBlob(pitch.notes)
          downloadBlob(blob, 'hexa-melody.mid')
        }}
        onDownloadMusicXml={() => {
          if (!musicXml) return
          downloadBlob(
            new Blob([musicXml], {
              type: 'application/vnd.recordare.musicxml+xml',
            }),
            'hexa-melody.musicxml',
          )
        }}
      />

      <section>
        <h2>6. 마켓플레이스 (더미)</h2>
        <ListForSaleButton
          disabled={!hasMelody}
          onClick={() => setPriceOpen(true)}
        />
      </section>

      <PriceInputModal
        open={priceOpen}
        price={price}
        onPriceChange={setPrice}
        onCancel={() => setPriceOpen(false)}
        onSubmit={() => {
          setPriceOpen(false)
          setSuccessOpen(true)
        }}
      />
      <ListingSuccessModal
        open={successOpen}
        price={price}
        onClose={() => setSuccessOpen(false)}
      />
    </main>
  )
}
