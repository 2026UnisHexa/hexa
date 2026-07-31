import * as Tone from 'tone'
import type { ChordVoicing } from '../types/chord'

let synth: Tone.PolySynth | Tone.Sampler | null = null
let usingSampler = false
let chordWaitTimer: ReturnType<typeof setTimeout> | null = null
let chordWaitResolve: (() => void) | null = null
let chordGeneration = 0

async function getInstrument(): Promise<Tone.PolySynth | Tone.Sampler> {
  if (synth) return synth

  await Tone.start()

  try {
    const sampler = new Tone.Sampler({
      urls: {
        C4: 'C4.mp3',
        'D#4': 'Ds4.mp3',
        'F#4': 'Fs4.mp3',
        A4: 'A4.mp3',
      },
      baseUrl: 'https://tonejs.github.io/audio/salamander/',
    }).toDestination()
    await Tone.loaded()
    synth = sampler
    usingSampler = true
    console.log('[chordPlayback] using Sampler (piano)')
    return sampler
  } catch (err) {
    console.warn('[chordPlayback] Sampler failed, PolySynth fallback', err)
    const poly = new Tone.PolySynth(Tone.Synth).toDestination()
    synth = poly
    usingSampler = false
    return poly
  }
}

export function isUsingPianoSampler(): boolean {
  return usingSampler
}

export async function playChordProgression(
  chords: ChordVoicing[],
  chordDurationSeconds = 0.8,
): Promise<void> {
  const generation = ++chordGeneration
  const instrument = await getInstrument()
  if (generation !== chordGeneration) return

  const now = Tone.now()

  chords.forEach((chord, i) => {
    const time = now + i * chordDurationSeconds
    instrument.triggerAttackRelease(
      chord.notes,
      chordDurationSeconds * 0.9,
      time,
    )
  })

  await new Promise<void>((resolve) => {
    chordWaitResolve = resolve
    chordWaitTimer = setTimeout(() => {
      chordWaitTimer = null
      chordWaitResolve = null
      resolve()
    }, chords.length * chordDurationSeconds * 1000 + 100)
  })
}

export async function stopChordPlayback(): Promise<void> {
  chordGeneration += 1
  if (chordWaitTimer !== null) {
    clearTimeout(chordWaitTimer)
    chordWaitTimer = null
  }
  if (chordWaitResolve) {
    const resolve = chordWaitResolve
    chordWaitResolve = null
    resolve()
  }
  if (!synth) return
  try {
    synth.releaseAll()
    // Dispose so already-scheduled future notes cannot fire.
    synth.dispose()
  } catch {
    // already disposed
  }
  synth = null
  usingSampler = false
}
