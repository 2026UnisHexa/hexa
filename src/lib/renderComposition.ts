import type { GenrePreset } from '../types/genre'
import type { MelodyNote } from '../types/midi'
import type { ChordVoicing } from '../types/chord'
import type { InstrumentId } from './instruments'
import { buildAccompanimentNotes, melodySpanSeconds } from './accompanimentNotes'

const SAMPLE_RATE = 44_100
const MAX_RENDER_SECONDS = 180

type Partial = { ratio: number; gain: number; type: OscillatorType }

function instrumentPartials(id: InstrumentId): Partial[] {
  if (id === 'synth') {
    return [
      { ratio: 1, gain: 0.72, type: 'sawtooth' },
      { ratio: 2, gain: 0.16, type: 'square' },
    ]
  }
  if (id === 'guitar-acoustic') {
    return [
      { ratio: 1, gain: 0.78, type: 'triangle' },
      { ratio: 2, gain: 0.2, type: 'sine' },
      { ratio: 3, gain: 0.08, type: 'sine' },
    ]
  }
  return [
    { ratio: 1, gain: 0.82, type: 'sine' },
    { ratio: 2, gain: 0.22, type: 'sine' },
    { ratio: 3, gain: 0.1, type: 'sine' },
  ]
}

function scheduleNote(
  context: OfflineAudioContext,
  destination: AudioNode,
  note: MelodyNote,
  offset: number,
  instrumentId: InstrumentId,
  volume: number,
): void {
  const start = Math.max(0, note.startTimeSeconds - offset)
  const duration = Math.max(0.06, note.durationSeconds)
  if (start >= MAX_RENDER_SECONDS) return

  const end = Math.min(MAX_RENDER_SECONDS, start + duration)
  const frequency = 440 * 2 ** ((Math.round(note.pitchMidi) - 69) / 12)
  const velocity = Math.max(0.08, Math.min(1, note.amplitude || 0.6))
  const attack = instrumentId === 'synth' ? 0.025 : 0.008
  const release = instrumentId === 'synth' ? 0.18 : 0.35
  const decayTarget = instrumentId === 'synth' ? 0.7 : instrumentId === 'piano' ? 0.22 : 0.3

  for (const partial of instrumentPartials(instrumentId)) {
    const oscillator = context.createOscillator()
    const envelope = context.createGain()
    const peak = Math.max(0.0001, velocity * volume * partial.gain)

    oscillator.type = partial.type
    oscillator.frequency.setValueAtTime(frequency * partial.ratio, start)
    envelope.gain.setValueAtTime(0.0001, start)
    envelope.gain.exponentialRampToValueAtTime(peak, start + attack)
    envelope.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, peak * decayTarget),
      Math.min(end, start + Math.max(attack + 0.04, duration * 0.55)),
    )
    envelope.gain.exponentialRampToValueAtTime(0.0001, end + release)

    oscillator.connect(envelope)
    envelope.connect(destination)
    oscillator.start(start)
    oscillator.stop(end + release + 0.02)
  }
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const channels = buffer.numberOfChannels
  const bytesPerSample = 2
  const dataSize = buffer.length * channels * bytesPerSample
  const arrayBuffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(arrayBuffer)

  function writeText(offset: number, value: string) {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i))
    }
  }

  writeText(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeText(8, 'WAVE')
  writeText(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, channels, true)
  view.setUint32(24, buffer.sampleRate, true)
  view.setUint32(28, buffer.sampleRate * channels * bytesPerSample, true)
  view.setUint16(32, channels * bytesPerSample, true)
  view.setUint16(34, 16, true)
  writeText(36, 'data')
  view.setUint32(40, dataSize, true)

  const channelData = Array.from({ length: channels }, (_, channel) =>
    buffer.getChannelData(channel),
  )
  let position = 44
  for (let i = 0; i < buffer.length; i += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channelData[channel]![i]!))
      view.setInt16(position, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
      position += bytesPerSample
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' })
}

/** Render the detected melody and selected accompaniment without the original voice. */
export async function renderCompositionAudio(
  melody: MelodyNote[],
  chords: ChordVoicing[],
  preset: GenrePreset,
  instrumentId: InstrumentId,
): Promise<Blob> {
  if (melody.length === 0) throw new Error('렌더링할 멜로디가 없습니다.')

  const firstStart = Math.min(...melody.map((note) => note.startTimeSeconds))
  const span = melodySpanSeconds(melody)
  const accompaniment = buildAccompanimentNotes(chords, preset, firstStart, span)
  const duration = Math.min(MAX_RENDER_SECONDS, span + 1.2)
  const context = new OfflineAudioContext(2, Math.ceil(duration * SAMPLE_RATE), SAMPLE_RATE)
  const compressor = context.createDynamicsCompressor()
  compressor.threshold.value = -12
  compressor.knee.value = 16
  compressor.ratio.value = 4
  compressor.connect(context.destination)

  for (const note of melody) {
    scheduleNote(context, compressor, note, firstStart, instrumentId, 0.32)
  }
  for (const note of accompaniment) {
    scheduleNote(context, compressor, note, firstStart, instrumentId, 0.16)
  }

  return audioBufferToWav(await context.startRendering())
}
