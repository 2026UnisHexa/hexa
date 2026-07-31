import {
  BasicPitch,
  addPitchBendsToNoteEvents,
  noteFramesToTime,
  outputToNotesPoly,
  type NoteEventTime,
} from '@spotify/basic-pitch'

const MODEL_URL = '/basic-pitch-model/model.json'

let pitchInstance: BasicPitch | null = null

function getBasicPitch(): BasicPitch {
  if (!pitchInstance) {
    pitchInstance = new BasicPitch(MODEL_URL)
  }
  return pitchInstance
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
  const basicPitch = getBasicPitch()
  const frames: number[][] = []
  const onsets: number[][] = []
  const contours: number[][] = []

  await basicPitch.evaluateModel(
    audioBuffer,
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
  const buffer = await blobToAudioBuffer(blob)
  console.log('[basicPitch] AudioBuffer', {
    duration: buffer.duration,
    sampleRate: buffer.sampleRate,
    channels: buffer.numberOfChannels,
  })
  const notes = await audioBufferToNotes(buffer, onProgress)
  console.log('[basicPitch] MIDI notes', notes)
  return notes
}
