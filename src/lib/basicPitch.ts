import {
  BasicPitch,
  addPitchBendsToNoteEvents,
  noteFramesToTime,
  outputToNotesPoly,
  type NoteEventTime,
} from '@spotify/basic-pitch'
import { denoiseAudioBuffer } from './audioClean'

const MODEL_URL = '/basic-pitch-model/model.json'
const TARGET_SAMPLE_RATE = 22050

let pitchInstance: BasicPitch | null = null

function getBasicPitch(): BasicPitch {
  if (!pitchInstance) {
    pitchInstance = new BasicPitch(MODEL_URL)
  }
  return pitchInstance
}

async function resampleAudioBuffer(
  audioBuffer: AudioBuffer,
  targetSampleRate: number,
): Promise<AudioBuffer> {
  const channels = audioBuffer.numberOfChannels
  const length = Math.ceil(
    audioBuffer.length * (targetSampleRate / audioBuffer.sampleRate),
  )
  const offlineCtx = new OfflineAudioContext(channels, length, targetSampleRate)
  const source = offlineCtx.createBufferSource()
  source.buffer = audioBuffer
  source.connect(offlineCtx.destination)
  source.start(0)
  return offlineCtx.startRendering()
}

export async function blobToAudioBuffer(blob: Blob): Promise<AudioBuffer> {
  const arrayBuffer = await blob.arrayBuffer()
  const audioCtx = new AudioContext()
  try {
    return await audioCtx.decodeAudioData(arrayBuffer.slice(0))
  } finally {
    await audioCtx.close()
  }
}

export async function audioBufferToNotes(
  audioBuffer: AudioBuffer,
  onProgress?: (pct: number) => void,
): Promise<NoteEventTime[]> {
  let buffer = audioBuffer
  if (buffer.sampleRate !== TARGET_SAMPLE_RATE) {
    const originalSampleRate = buffer.sampleRate
    buffer = await resampleAudioBuffer(buffer, TARGET_SAMPLE_RATE)
    console.log(
      `[basicPitch] Resampled: ${originalSampleRate} → ${TARGET_SAMPLE_RATE}`,
    )
  }

  if (buffer.sampleRate !== TARGET_SAMPLE_RATE) {
    throw new Error(
      `Input audio buffer is not at correct sample rate! Is ${buffer.sampleRate}. Should be ${TARGET_SAMPLE_RATE}`,
    )
  }

  const basicPitch = getBasicPitch()
  const frames: number[][] = []
  const onsets: number[][] = []
  const contours: number[][] = []

  await basicPitch.evaluateModel(
    buffer,
    (f, o, c) => {
      frames.push(...f)
      onsets.push(...o)
      contours.push(...c)
    },
    (pct) => {
      onProgress?.(pct)
    },
  )

  const notes = noteFramesToTime(
    addPitchBendsToNoteEvents(
      contours,
      outputToNotesPoly(frames, onsets, 0.5, 0.3, 5),
    ),
  )

  return notes
}

export async function audioBlobToNotes(
  blob: Blob,
  onProgress?: (pct: number) => void,
): Promise<NoteEventTime[]> {
  const raw = await blobToAudioBuffer(blob)
  console.log('[basicPitch] AudioBuffer (raw)', {
    duration: raw.duration,
    sampleRate: raw.sampleRate,
    channels: raw.numberOfChannels,
  })

  const cleaned = await denoiseAudioBuffer(raw)
  const notes = await audioBufferToNotes(cleaned, onProgress)
  console.log('[basicPitch] MIDI notes (after denoise)', notes)
  return notes
}
