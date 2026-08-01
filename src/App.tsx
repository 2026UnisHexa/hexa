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
import {
  PriceInputModal,
  type ListingAudioMode,
} from './components/Marketplace/PriceInputModal'
import { ListingSuccessModal } from './components/Marketplace/ListingSuccessModal'
import { MyPageView } from './components/MyPage/MyPageView'
import { VoiceLyricsView } from './components/VoiceMemo/VoiceLyricsView'
import { LoadingState } from './components/common/LoadingState'
import { ErrorMessage } from './components/common/ErrorMessage'
import { useRecorder } from './hooks/useRecorder'
import { useBasicPitch } from './hooks/useBasicPitch'
import { useLocalStorage } from './hooks/useLocalStorage'
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
  melodySpanSeconds,
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
import type { MarketplaceListing } from './types/listing'
import { isOwnedBy } from './types/listing'
import type { UserProfile } from './types/user'
import { AUTH_LOGIN_KEY, USER_STORAGE_KEY } from './types/user'
import { loadJson, saveJson } from './lib/storage'
import { clearSession, getAccessToken, getStoredLoginId, readLoginIdFromToken } from './lib/auth'
import { renderCompositionAudio } from './lib/renderComposition'
import {
  deleteRemoteAudio,
  isRemoteListingId,
  listMyAudio,
  uploadAudio,
} from './lib/audioApi'

type View = 'home' | 'create' | 'marketplace' | 'mypage' | 'voice'

function defaultProfile(loginId: string): UserProfile {
  return {
    loginId,
    displayName: loginId,
    bio: '',
    joinedAt: new Date().toISOString(),
  }
}

function loadOrCreateProfile(): UserProfile {
  const saved = loadJson<UserProfile>(USER_STORAGE_KEY)
  const loginId =
    loadJson<string>(AUTH_LOGIN_KEY) ?? saved?.loginId ?? 'guest'
  if (saved && saved.loginId === loginId) return saved
  const profile = defaultProfile(loginId)
  saveJson(USER_STORAGE_KEY, profile)
  return profile
}

const SEED_LISTINGS: MarketplaceListing[] = [
  {
    id: 'seed-1',
    title: '새벽 창가의 허밍',
    price: 1200,
    genreId: 'ballad',
    genreLabel: '발라드',
    chordLabel: '감성 진행',
    noteCount: 24,
    tempoBpm: 72,
    createdAt: '2026-07-20T10:00:00.000Z',
    mine: false,
    ownerId: null,
  },
  {
    id: 'seed-2',
    title: '비 오는 날의 리프',
    price: 2000,
    genreId: 'jazz',
    genreLabel: '재즈',
    chordLabel: '재즈 II-V-I',
    noteCount: 36,
    tempoBpm: 96,
    createdAt: '2026-07-22T14:30:00.000Z',
    mine: false,
    ownerId: null,
  },
  {
    id: 'seed-3',
    title: '버스 정류장 멜로디',
    price: 900,
    genreId: 'pop',
    genreLabel: '팝',
    chordLabel: '팝 진행',
    noteCount: 18,
    tempoBpm: 110,
    createdAt: '2026-07-28T09:15:00.000Z',
    mine: false,
    ownerId: null,
  },
  {
    id: 'seed-4',
    title: '아침 창가 허밍',
    price: 1500,
    genreId: 'ballad',
    genreLabel: '발라드',
    chordLabel: '안정적인 팝 진행',
    noteCount: 28,
    tempoBpm: 76,
    createdAt: '2026-07-30T08:20:00.000Z',
    mine: false,
    ownerId: null,
  },
  {
    id: 'seed-5',
    title: '퇴근길 휘파람 멜로디',
    price: 1800,
    genreId: 'pop',
    genreLabel: '팝',
    chordLabel: '밝은 메이저 진행',
    noteCount: 32,
    tempoBpm: 108,
    createdAt: '2026-07-31T19:05:00.000Z',
    mine: false,
    ownerId: null,
  },
  {
    id: 'seed-6',
    title: '비 오는 오후 스케치',
    price: 2200,
    genreId: 'jazz',
    genreLabel: '재즈',
    chordLabel: '부드러운 진행',
    noteCount: 40,
    tempoBpm: 92,
    createdAt: '2026-08-01T14:40:00.000Z',
    mine: false,
    ownerId: null,
  },
]

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
  const [listings, setListings] = useLocalStorage<MarketplaceListing[]>(
    'marketplace-listings-v3',
    SEED_LISTINGS,
  )
  const [profile, setProfile] = useLocalStorage<UserProfile>(
    USER_STORAGE_KEY,
    loadOrCreateProfile(),
  )
  const [priceOpen, setPriceOpen] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const [listingTitle, setListingTitle] = useState('나의 허밍 멜로디')
  const [price, setPrice] = useState('1000')
  const [listingAudioMode, setListingAudioMode] =
    useState<ListingAudioMode>('composition')
  const [lastListedTitle, setLastListedTitle] = useState('나의 허밍 멜로디')
  const [listingSaving, setListingSaving] = useState(false)
  const [listingError, setListingError] = useState<string | null>(null)
  const [pipelineError, setPipelineError] = useState<string | null>(null)
  const processedBlobRef = useRef<Blob | null>(null)

  useEffect(() => {
    const token = getAccessToken()
    if (!token) return

    // 현재 Render 백엔드에 GET /me 가 없음(404).
    // 로그인 시 받은 JWT payload(sub/login_id)로 세션만 유지한다.
    const loginId = readLoginIdFromToken(token) ?? getStoredLoginId()
    if (!loginId) return

    setProfile((prev) =>
      prev.loginId === loginId
        ? prev
        : {
            loginId,
            displayName: prev.displayName || loginId,
            bio: prev.bio,
            joinedAt: prev.joinedAt || new Date().toISOString(),
          },
    )
  }, [setProfile])

  useEffect(() => {
    if (!getAccessToken()) return

    let cancelled = false
    void (async () => {
      try {
        const mine = await listMyAudio()
        if (cancelled) return
        setListings((prev) => {
          const others = prev.filter(
            (l) => !isRemoteListingId(l.id) && !isOwnedBy(l, profile.loginId),
          )
          const seedOthers = SEED_LISTINGS.filter((s) =>
            others.every((o) => o.id !== s.id),
          )
          return [...mine, ...others, ...seedOthers]
        })
      } catch (err) {
        console.warn('[App] sync remote audio failed', err)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [profile.loginId, setListings])

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

  function handleLogout() {
    clearSession()
    window.location.assign('/login')
  }

  async function registerListing() {
    const trimmed = listingTitle.trim()
    if (!trimmed || !hasMelody) return

    if (!recorder.audioBlob) {
      setListingError('녹음 파일이 없습니다. step 1에서 다시 녹음해 주세요.')
      return
    }
    if (!getAccessToken()) {
      setListingError('로그인 후 등록할 수 있습니다.')
      return
    }

    const parsedPrice = Math.max(0, Number(price) || 0)
    setListingSaving(true)
    setListingError(null)

    try {
      if (listingAudioMode === 'composition' && !selectedSuggestion) {
        throw new Error('코드 진행을 먼저 선택해 주세요.')
      }
      const renderedAudio = await renderCompositionAudio(
        pitch.notes,
        listingAudioMode === 'composition'
          ? (selectedSuggestion?.chords ?? [])
          : [],
        genrePreset,
        selectedInstrument,
      )
      const created = await uploadAudio({
        title: trimmed,
        price: parsedPrice,
        genreLabel: genrePreset.label,
        chordLabel:
          listingAudioMode === 'composition'
            ? (selectedSuggestion?.label ?? null)
            : null,
        tempoBpm,
        noteCount: pitch.notes.length,
        audioBlob: renderedAudio,
        fileName: `hexa-${selectedInstrument}.wav`,
      })

      setListings((prev) => [
        created,
        ...prev.filter((l) => l.id !== created.id),
      ])
      setLastListedTitle(trimmed)
      setPriceOpen(false)
      setSuccessOpen(true)
    } catch (err) {
      console.error('[App] registerListing failed', err)
      setListingError(
        err instanceof Error ? err.message : '등록에 실패했습니다.',
      )
    } finally {
      setListingSaving(false)
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

      const { notes, correction } = await pitch.transcribe(blob)
      if (cancelled || notes.length === 0) return

      goToStep(2)

      setSuggestLoading(true)
      try {
        const bpm = estimateTempoBpm(notes)
        const noteCount = melodySummaryNoteCount(notes)
        const summary = summarizeMelody(
          notes,
          bpm,
          correction?.key?.label ?? null,
        )
        console.log('[App] melody summary', { summary, noteCount, correction })
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
      <AppHeader
        view={view}
        onNavigate={navigate}
      />

      <div className="app-body">
        {view === 'home' ? (
          <HomeView
            onOpenMarketplace={() => navigate('marketplace')}
            onCreate={() => navigate('create')}
            onVoiceMemo={() => navigate('voice')}
          />
        ) : null}

        {view === 'voice' ? <VoiceLyricsView /> : null}

        {view === 'marketplace' ? (
          <MarketplaceView
            listings={listings}
            currentLoginId={profile.loginId}
          />
        ) : null}

        {view === 'mypage' ? (
          <MyPageView
            profile={profile}
            listings={listings.filter((l) => isOwnedBy(l, profile.loginId))}
            onProfileChange={setProfile}
            onUpdateListingPrice={(id, price) =>
              setListings((prev) =>
                prev.map((l) => (l.id === id ? { ...l, price } : l)),
              )
            }
            onDeleteListing={(id) => {
              void (async () => {
                try {
                  if (isRemoteListingId(id)) {
                    await deleteRemoteAudio(id)
                  }
                } catch (err) {
                  console.warn('[App] delete remote audio failed', err)
                  setPipelineError(
                    err instanceof Error
                      ? err.message
                      : '서버에서 작품 삭제에 실패했습니다.',
                  )
                  return
                }
                setListings((prev) => prev.filter((l) => l.id !== id))
              })()
            }}
            onCreate={() => navigate('create')}
            onOpenMarketplace={() => navigate('marketplace')}
            onLogout={handleLogout}
          />
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
                      {pitch.correction?.key
                        ? ` · 추정 조성 ${pitch.correction.keyLabel}`
                        : null}
                      {pitch.correction &&
                      pitch.correction.mergedFrom > pitch.correction.mergedTo
                        ? ` · 병합 ${pitch.correction.mergedFrom}→${pitch.correction.mergedTo}`
                        : null}
                      {pitch.correction &&
                      (pitch.correction.snappedCount > 0 ||
                        pitch.correction.removedCount > 0)
                        ? ` · 보정(스냅 ${pitch.correction.snappedCount} / 제거 ${pitch.correction.removedCount})`
                        : null}
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
                          melodySpanSeconds(pitch.notes),
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
                          melodySpanSeconds(pitch.notes),
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
                      onClick={() => {
                        setListingTitle(
                          (prev) => prev.trim() || '나의 허밍 멜로디',
                        )
                        setPriceOpen(true)
                        setListingError(null)
                      }}
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
                  disabled={step === 1 && !hasMelody}
                  onClick={() => {
                    if (step >= 5) {
                      navigate('mypage')
                      return
                    }
                    goToStep(Math.min(5, step + 1))
                  }}
                >
                  {step >= 5 ? '완료' : '다음'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <PriceInputModal
        open={priceOpen}
        title={listingTitle}
        price={price}
        audioMode={listingAudioMode}
        saving={listingSaving}
        error={listingError}
        onTitleChange={setListingTitle}
        onPriceChange={setPrice}
        onAudioModeChange={setListingAudioMode}
        onCancel={() => {
          if (listingSaving) return
          setListingError(null)
          setPriceOpen(false)
        }}
        onSubmit={() => {
          void registerListing()
        }}
      />
      <ListingSuccessModal
        open={successOpen}
        title={lastListedTitle}
        price={price}
        onClose={() => setSuccessOpen(false)}
        onGoToMarketplace={() => {
          setSuccessOpen(false)
          navigate('marketplace')
        }}
      />
    </div>
  )
}
