import { useEffect, useState } from 'react'
import { VoiceMemo } from '../VoiceMemo/VoiceMemo'
import { GenrePreset } from '../GenrePreset/GenrePreset'
import { LyricsSuggestions } from '../LyricsSuggestions/LyricsSuggestions'
import { ErrorMessage } from '../common/ErrorMessage'
import { useLyricsSuggestion } from '../../hooks/useLyricsSuggestion'
import { getGenrePreset } from '../../lib/presets'
import type { GenreId } from '../../types/genre'

type LyricsStep = 1 | 2

export function VoiceLyricsView() {
  const [step, setStep] = useState<LyricsStep>(1)
  const [text, setText] = useState('')
  const [genreId, setGenreId] = useState<GenreId>('pop')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const lyrics = useLyricsSuggestion()

  const genreLabel = getGenrePreset(genreId).label
  const canMakeLyrics = text.trim().length > 0

  useEffect(() => {
    if (step !== 2 || !text.trim()) return

    let cancelled = false
    void (async () => {
      const result = await lyrics.suggest(text, genreLabel)
      if (!cancelled) {
        setSelectedIndex(0)
        console.log('[VoiceLyricsView] lyrics', result)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [step, genreLabel, text, lyrics.suggest])

  return (
    <div className="voice-memo-page">
      <h1 className="voice-memo-page__title">말하기 → 가사</h1>
      <p className="muted voice-lyrics__intro">
        말로 남긴 텍스트를 바탕으로 AI가 노래 가사를 제안합니다. 멜로디 만들기
        플로우와는 별도입니다.
      </p>

      <div className="voice-lyrics__steps" role="tablist" aria-label="가사 만들기 단계">
        <button
          type="button"
          role="tab"
          aria-selected={step === 1}
          className={`voice-lyrics__step${step === 1 ? ' is-active' : ''}`}
          onClick={() => setStep(1)}
        >
          1. 말하기 → 텍스트
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={step === 2}
          className={`voice-lyrics__step${step === 2 ? ' is-active' : ''}`}
          onClick={() => {
            if (!canMakeLyrics) return
            setStep(2)
          }}
          disabled={!canMakeLyrics}
        >
          2. 가사 만들기
        </button>
      </div>

      {step === 1 ? (
        <>
          <VoiceMemo text={text} onTextChange={setText} />
          <div className="create-main__footer">
            <span />
            <button
              type="button"
              className="btn btn--primary"
              disabled={!canMakeLyrics}
              onClick={() => setStep(2)}
            >
              가사 만들기로
            </button>
          </div>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <GenrePreset value={genreId} onChange={setGenreId} />
          {lyrics.error ? <ErrorMessage message={lyrics.error} /> : null}
          <LyricsSuggestions
            suggestions={lyrics.suggestions}
            selectedIndex={selectedIndex}
            loading={lyrics.loading}
            onSelect={setSelectedIndex}
          />
          <div className="create-main__footer">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setStep(1)}
            >
              이전
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              disabled={!canMakeLyrics || lyrics.loading}
              onClick={() => {
                void lyrics.suggest(text, genreLabel).then(() => {
                  setSelectedIndex(0)
                })
              }}
            >
              다시 제안받기
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}
