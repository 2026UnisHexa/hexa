import { useEffect, useMemo, useRef, useState } from 'react'
import { AppHeader } from './components/layout/AppHeader'
import {
  CREATE_STEPS,
  StepSidebar,
} from './components/layout/StepSidebar'
import { HomeView } from './components/Home/HomeView'
import { MarketplaceView } from './components/Marketplace/MarketplaceView'
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
import {
  useChordPlayback,
  useInstrument,
  usePlayback,
} from './hooks/usePlayback'
import { suggestChordProgressions } from './lib/claude'
import {
  compositionToMusicXml,
  melodyNotesToMusicXml,
} from './lib/midiToMusicXml'
import {
  compositionToMidiBlob,
  downloadBlob,
  melodyNotesToMidiBlob,
} from './lib/midiDownload'
import {
  buildAccompanimentNotes,
  melodyAccompanimentStart,
} from './lib/accompanimentNotes'
import { getGenrePreset } from './lib/presets'
import type { InstrumentId } from './lib/instruments'
import {
  estimateTempoBpm,
  melodySummaryNoteCount,
  summarizeMelody,
} from './utils/melodySummary'
import type { ChordSuggestion } from './types/chord'
import type { GenreId } from './types/genre'

type View = 'home' | 'create' | 'marketplace'

export default function App() {
  const [view, setView] = useState<View>('home')
  const [step, setStep] = useState(1)
  const [maxReached, setMaxReached] = useState(1)

  const recorder = useRecorder()
  const pitch = useBasicPitch()
  const [selectedInstrument, setSelectedInstrument] =
    useState<InstrumentId>('piano')
  const instrument = useInstrument(selectedInstrument)
  const playback = usePlayback(selectedInstrument)
  const chordPlayback = useChordPlayback()
  const stopChords = chordPlayback.stop

  const [suggestions, setSuggestions] = useState<ChordSuggestion[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [playingChordIndex, setPlayingChordIndex] = useState<number | null>(
    null,
  )
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
  const isPlayingMelody = playback.mode === 'melody'
  const isPlayingChords = chordPlayback.playing
  const currentStepMeta =
    CREATE_STEPS.find((s) => s.id === step) ?? CREATE_STEPS[0]

  function goToStep(next: number) {
    setStep(next)
    setMaxReached((prev) => Math.max(prev, next))
  }

  function navigate(next: View) {
    setView(next)
    if (next === 'create') {
      setStep((s) => s)
      setMaxReached((m) => Math.max(m, 1))
    }
  }

  useEffect(() => {
    if (!isPlayingChords) {
      setPlayingChordIndex(null)
    }
  }, [isPlayingChords])

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
      stopChords()
      setPlayingChordIndex(null)

      const notes = await pitch.transcribe(blob)
      if (cancelled || notes.length === 0) return

      goToStep(2)

      setSuggestLoading(true)
      try {
        const bpm = estimateTempoBpm(notes)
        const noteCount = melodySummaryNoteCount(notes)
        const summary = summarizeMelody(notes, bpm)
        console.log('[App] melody summary', { summary, noteCount })
        const result = await suggestChordProgressions(summary, noteCount)
        if (!cancelled) {
          setSuggestions(result)
          setSelectedIndex(0)
          setMaxReached((prev) => Math.max(prev, 3))
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
  }, [recorder.status, recorder.audioBlob, pitch.transcribe, stopChords])

  return (
    <div className="app-shell">
      <AppHeader view={view} onNavigate={navigate} />

      <div className="app-body">
        {view === 'home' ? (
          <HomeView
            onOpenMarketplace={() => navigate('marketplace')}
            onCreate={() => navigate('create')}
          />
        ) : null}

        {view === 'marketplace' ? (
          <MarketplaceView onCreate={() => navigate('create')} />
        ) : null}

        {view === 'create' ? (
          <div className="create-layout">
            <StepSidebar
              currentStep={step}
              maxReached={maxReached}
              onSelect={goToStep}
            />

            <div className="create-main">
              <h1 className="create-main__title">{currentStepMeta.title}</h1>

              {pitch.loading ? (
                <LoadingState
                  message={`Basic Pitch 인식 중… ${pitch.progress}%`}
                />
              ) : null}
              {pitch.error ? <ErrorMessage message={pitch.error} /> : null}
              {pipelineError ? <ErrorMessage message={pipelineError} /> : null}
              {instrument.error ? (
                <ErrorMessage message={`악기 로드 실패: ${instrument.error}`} />
              ) : null}

              {step === 1 ? (
                <Recorder
                  status={recorder.status}
                  error={recorder.error}
                  onStart={() => {
                    processedBlobRef.current = null
                    void recorder.start()
                  }}
                  onStop={recorder.stop}
                />
              ) : null}

              {step === 2 ? (
                <>
                  {hasMelody ? (
                    <p className="muted">
                      인식된 노트 {pitch.notes.length}개 · 추정 템포 {tempoBpm}{' '}
                      BPM
                    </p>
                  ) : null}
                  <ScoreView
                    musicXml={musicXml}
                    hasMelody={hasMelody}
                    isPlayingMelody={isPlayingMelody}
                    instrumentLoading={instrument.isLoading}
                    selectedInstrument={selectedInstrument}
                    onInstrumentChange={(id) => {
                      if (isPlayingMelody) playback.stop()
                      setSelectedInstrument(id)
                    }}
                    onToggleMelody={() => {
                      if (instrument.isLoading) return
                      playback.toggleMelody(pitch.notes)
                    }}
                  />
                  <div className="panel" style={{ marginTop: 16 }}>
                    <p className="muted">
                      원본 멜로디만 다운로드합니다. (코드·장르 반주 미포함)
                    </p>
                    <div className="download-actions">
                      <DownloadButtons
                        disabled={!hasMelody || !musicXml}
                        onDownloadMidi={() => {
                          const blob = melodyNotesToMidiBlob(pitch.notes)
                          downloadBlob(blob, 'hexa-melody-original.mid')
                        }}
                        onDownloadMusicXml={() => {
                          if (!musicXml) return
                          downloadBlob(
                            new Blob([musicXml], {
                              type: 'application/vnd.recordare.musicxml+xml',
                            }),
                            'hexa-melody-original.musicxml',
                          )
                        }}
                      />
                    </div>
                  </div>
                </>
              ) : null}

              {step === 3 ? (
                <ChordSuggestions
                  suggestions={suggestions}
                  selectedIndex={selectedIndex}
                  loading={suggestLoading}
                  playingIndex={isPlayingChords ? playingChordIndex : null}
                  onSelect={(i) => {
                    if (isPlayingChords) chordPlayback.stop()
                    setPlayingChordIndex(null)
                    setSelectedIndex(i)
                  }}
                  onTogglePlay={(i) => {
                    if (isPlayingChords && playingChordIndex === i) {
                      chordPlayback.stop()
                      setPlayingChordIndex(null)
                      return
                    }
                    const s = suggestions[i]
                    if (!s) return
                    setSelectedIndex(i)
                    setPlayingChordIndex(i)
                    void chordPlayback.play(
                      s.chords,
                      genrePreset.chordDurationSeconds,
                    )
                  }}
                />
              ) : null}

              {step === 4 ? (
                <>
                  <GenrePreset value={genreId} onChange={setGenreId} />
                  <div style={{ height: 16 }} />
                  <PlaybackControls
                    melodyDisabled={!hasMelody || instrument.isLoading}
                    accompanimentDisabled={
                      !hasMelody || !selectedSuggestion || instrument.isLoading
                    }
                    mode={playback.mode}
                    onToggleMelody={() => {
                      if (instrument.isLoading) return
                      playback.toggleMelody(pitch.notes)
                    }}
                    onToggleWithAccompaniment={() => {
                      if (!selectedSuggestion) {
                        if (playback.mode === 'accompaniment') playback.stop()
                        return
                      }
                      if (instrument.isLoading) return
                      playback.toggleWithAccompaniment(
                        pitch.notes,
                        selectedSuggestion.chords,
                        genrePreset,
                      )
                    }}
                  />
                </>
              ) : null}

              {step === 5 ? (
                <>
                  <PlaybackControls
                    melodyDisabled={!hasMelody || instrument.isLoading}
                    accompanimentDisabled={
                      !hasMelody || !selectedSuggestion || instrument.isLoading
                    }
                    mode={playback.mode}
                    onToggleMelody={() => {
                      if (instrument.isLoading) return
                      playback.toggleMelody(pitch.notes)
                    }}
                    onToggleWithAccompaniment={() => {
                      if (!selectedSuggestion) {
                        if (playback.mode === 'accompaniment') playback.stop()
                        return
                      }
                      if (instrument.isLoading) return
                      playback.toggleWithAccompaniment(
                        pitch.notes,
                        selectedSuggestion.chords,
                        genrePreset,
                      )
                    }}
                  />
                  <p className="muted">
                    {selectedSuggestion
                      ? `선택 코드「${selectedSuggestion.label}」· 장르「${genrePreset.label}」(${genrePreset.pattern})가 MIDI/MusicXML 반주 트랙에 포함됩니다.`
                      : '코드 진행을 선택해야 반주가 포함된 파일을 받을 수 있습니다.'}
                  </p>
                  <div className="download-actions">
                    <DownloadButtons
                      disabled={
                        !hasMelody || !musicXml || !selectedSuggestion
                      }
                      onDownloadMidi={() => {
                        if (!selectedSuggestion) return
                        const acc = buildAccompanimentNotes(
                          selectedSuggestion.chords,
                          genrePreset,
                          melodyAccompanimentStart(pitch.notes),
                        )
                        const blob = compositionToMidiBlob(pitch.notes, acc)
                        downloadBlob(blob, 'hexa-composition.mid')
                      }}
                      onDownloadMusicXml={() => {
                        if (!selectedSuggestion) return
                        const acc = buildAccompanimentNotes(
                          selectedSuggestion.chords,
                          genrePreset,
                          melodyAccompanimentStart(pitch.notes),
                        )
                        const xml = compositionToMusicXml(
                          [
                            {
                              id: 'P1',
                              name: 'Melody',
                              notes: pitch.notes,
                            },
                            {
                              id: 'P2',
                              name: `Accompaniment (${genrePreset.label})`,
                              notes: acc,
                            },
                          ],
                          tempoBpm,
                          'Hexa Composition',
                        )
                        downloadBlob(
                          new Blob([xml], {
                            type: 'application/vnd.recordare.musicxml+xml',
                          }),
                          'hexa-composition.musicxml',
                        )
                      }}
                    />
                    <ListForSaleButton
                      disabled={!hasMelody}
                      onClick={() => setPriceOpen(true)}
                    />
                  </div>
                </>
              ) : null}

              <div className="create-main__footer">
                <button
                  type="button"
                  className="btn btn--ghost"
                  disabled={step <= 1}
                  onClick={() => goToStep(step - 1)}
                >
                  이전
                </button>
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={step >= 5 || (step === 1 && !hasMelody)}
                  onClick={() => goToStep(Math.min(5, step + 1))}
                >
                  다음
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

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
    </div>
  )
}
