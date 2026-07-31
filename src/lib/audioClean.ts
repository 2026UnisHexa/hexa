/**
 * Light browser-side denoise for humming → Basic Pitch.
 * Not ML spectral subtraction; uses capture constraints + HP + noise gate.
 */

const HUM_HIGHPASS_HZ = 90
const FRAME_MS = 20
const NOISE_PERCENTILE = 0.15
const GATE_RATIO = 2.2
const GATE_FLOOR = 0.002
const ATTACK = 0.85
const RELEASE = 0.25

function mixToMono(buffer: AudioBuffer): Float32Array {
  const len = buffer.length
  const mono = new Float32Array(len)
  const ch = buffer.numberOfChannels
  if (ch === 1) {
    mono.set(buffer.getChannelData(0))
    return mono
  }
  for (let c = 0; c < ch; c += 1) {
    const data = buffer.getChannelData(c)
    for (let i = 0; i < len; i += 1) {
      mono[i]! += data[i]! / ch
    }
  }
  return mono
}

function frameRms(samples: Float32Array, frameSize: number): number[] {
  const rms: number[] = []
  for (let i = 0; i < samples.length; i += frameSize) {
    const end = Math.min(i + frameSize, samples.length)
    let sum = 0
    for (let j = i; j < end; j += 1) {
      const s = samples[j]!
      sum += s * s
    }
    rms.push(Math.sqrt(sum / Math.max(1, end - i)))
  }
  return rms
}

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0
  const idx = Math.min(
    sortedAsc.length - 1,
    Math.max(0, Math.floor((sortedAsc.length - 1) * p)),
  )
  return sortedAsc[idx]!
}

/** Soft noise gate based on quiet-frame noise floor. */
export function applyNoiseGate(
  samples: Float32Array,
  sampleRate: number,
): Float32Array {
  const frameSize = Math.max(1, Math.round((sampleRate * FRAME_MS) / 1000))
  const rms = frameRms(samples, frameSize)
  const sorted = [...rms].sort((a, b) => a - b)
  const noiseFloor = Math.max(GATE_FLOOR, percentile(sorted, NOISE_PERCENTILE))
  const threshold = noiseFloor * GATE_RATIO

  const out = new Float32Array(samples.length)
  let gain = 0

  for (let f = 0; f < rms.length; f += 1) {
    const target = rms[f]! >= threshold ? 1 : 0
    gain += (target - gain) * (target > gain ? ATTACK : RELEASE)
    const start = f * frameSize
    const end = Math.min(start + frameSize, samples.length)
    for (let i = start; i < end; i += 1) {
      out[i] = samples[i]! * gain
    }
  }

  return out
}

async function applyHighPass(
  mono: Float32Array,
  sampleRate: number,
  cutoffHz: number,
): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(1, mono.length, sampleRate)
  const buffer = ctx.createBuffer(1, mono.length, sampleRate)
  buffer.getChannelData(0).set(mono)

  const source = ctx.createBufferSource()
  source.buffer = buffer

  const filter = ctx.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = cutoffHz
  filter.Q.value = 0.707

  source.connect(filter)
  filter.connect(ctx.destination)
  source.start(0)
  return ctx.startRendering()
}

/** Peak-normalize so quiet hums still reach Basic Pitch. */
export function normalizePeak(
  samples: Float32Array,
  targetPeak = 0.9,
): Float32Array {
  let peak = 0
  for (let i = 0; i < samples.length; i += 1) {
    peak = Math.max(peak, Math.abs(samples[i]!))
  }
  if (peak < 1e-6) return samples
  const scale = targetPeak / peak
  const out = new Float32Array(samples.length)
  for (let i = 0; i < samples.length; i += 1) {
    out[i] = samples[i]! * scale
  }
  return out
}

/**
 * Clean recording for pitch detection:
 * mono → high-pass → noise gate → normalize.
 */
export async function denoiseAudioBuffer(
  input: AudioBuffer,
): Promise<AudioBuffer> {
  const mono = mixToMono(input)
  const gated = applyNoiseGate(mono, input.sampleRate)
  const hp = await applyHighPass(gated, input.sampleRate, HUM_HIGHPASS_HZ)
  const cleaned = normalizePeak(hp.getChannelData(0))

  const out = new AudioBuffer({
    length: cleaned.length,
    numberOfChannels: 1,
    sampleRate: input.sampleRate,
  })
  out.getChannelData(0).set(cleaned)

  console.log('[audioClean] denoise', {
    duration: out.duration,
    sampleRate: out.sampleRate,
    peakBefore: peakOf(mono),
    peakAfter: peakOf(cleaned),
  })

  return out
}

function peakOf(samples: Float32Array): number {
  let peak = 0
  for (let i = 0; i < samples.length; i += 1) {
    peak = Math.max(peak, Math.abs(samples[i]!))
  }
  return Number(peak.toFixed(4))
}
