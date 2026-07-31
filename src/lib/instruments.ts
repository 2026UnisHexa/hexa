import * as Tone from 'tone'

export type InstrumentId = 'piano' | 'synth' | 'guitar-acoustic'

export type PlayableInstrument = Tone.PolySynth | Tone.Sampler

export const INSTRUMENT_OPTIONS: {
  id: InstrumentId
  label: string
}[] = [
  { id: 'piano', label: '피아노' },
  { id: 'synth', label: '신스' },
  { id: 'guitar-acoustic', label: '어쿠스틱 기타' },
]

type SamplePreset = {
  urls: Record<string, string>
  baseUrl: string
}

/** Same salamander set as the original chordPlayback piano. */
const PIANO_PRESET: SamplePreset = {
  urls: {
    C4: 'C4.mp3',
    'D#4': 'Ds4.mp3',
    'F#4': 'Fs4.mp3',
    A4: 'A4.mp3',
  },
  baseUrl: 'https://tonejs.github.io/audio/salamander/',
}

const GUITAR_PRESET: SamplePreset = {
  urls: {
    E2: 'E2.mp3',
    A2: 'A2.mp3',
    D3: 'D3.mp3',
    G3: 'G3.mp3',
    B3: 'B3.mp3',
    E4: 'E4.mp3',
  },
  baseUrl:
    'https://nbrosowsky.github.io/tonejs-instruments/samples/guitar-acoustic/',
}

const cache = new Map<InstrumentId, PlayableInstrument>()
const loading = new Map<InstrumentId, Promise<PlayableInstrument>>()
const readyFlags = new Map<InstrumentId, boolean>()

export function isInstrumentReady(id: InstrumentId): boolean {
  return readyFlags.get(id) === true && cache.has(id)
}

async function createSampler(
  id: InstrumentId,
  preset: SamplePreset,
): Promise<Tone.Sampler> {
  const sampler = new Tone.Sampler({
    urls: preset.urls,
    baseUrl: preset.baseUrl,
  }).toDestination()
  await Tone.loaded()
  console.log(`[instruments] Sampler ready (${id})`)
  return sampler
}

async function createInstrument(id: InstrumentId): Promise<PlayableInstrument> {
  await Tone.start()

  if (id === 'synth') {
    const poly = new Tone.PolySynth(Tone.Synth).toDestination()
    console.log('[instruments] PolySynth ready (synth)')
    return poly
  }

  const preset = id === 'piano' ? PIANO_PRESET : GUITAR_PRESET
  try {
    return await createSampler(id, preset)
  } catch (err) {
    console.warn(`[instruments] Sampler failed (${id}), PolySynth fallback`, err)
    return new Tone.PolySynth(Tone.Synth).toDestination()
  }
}

/** Shared instrument instances — do not dispose; call releaseAll on stop. */
export async function getInstrument(
  id: InstrumentId,
): Promise<PlayableInstrument> {
  const existing = cache.get(id)
  if (existing) return existing

  const inFlight = loading.get(id)
  if (inFlight) return inFlight

  const promise = createInstrument(id)
    .then((instrument) => {
      cache.set(id, instrument)
      readyFlags.set(id, true)
      loading.delete(id)
      return instrument
    })
    .catch((err) => {
      loading.delete(id)
      readyFlags.set(id, false)
      throw err
    })

  loading.set(id, promise)
  return promise
}

export function releaseInstrumentNotes(id?: InstrumentId): void {
  if (id) {
    const instrument = cache.get(id)
    if (instrument) {
      try {
        instrument.releaseAll()
      } catch {
        // ignore
      }
    }
    return
  }
  for (const instrument of cache.values()) {
    try {
      instrument.releaseAll()
    } catch {
      // ignore
    }
  }
}

export function midiToNoteName(pitchMidi: number): string {
  return Tone.Frequency(pitchMidi, 'midi').toNote()
}
