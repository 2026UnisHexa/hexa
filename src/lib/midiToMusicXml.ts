import type { MelodyNote } from '../types/midi'
import { estimateTempoBpm, midiToNoteName } from '../utils/melodySummary'

const DIVISIONS = 4 // quarter note = 4
const MEASURE_CAPACITY = DIVISIONS * 4
const TIME_EPS = 1e-4

function parseNoteName(pitchMidi: number): {
  step: string
  alter: number
  octave: number
} {
  const name = midiToNoteName(pitchMidi)
  const match = name.match(/^([A-G])(#?)(-?\d+)$/)
  if (!match) {
    return { step: 'C', alter: 0, octave: 4 }
  }
  return {
    step: match[1]!,
    alter: match[2] === '#' ? 1 : 0,
    octave: Number(match[3]),
  }
}

function noteType(duration: number): string {
  if (duration >= DIVISIONS * 2) return 'half'
  if (duration >= DIVISIONS) return 'quarter'
  if (duration >= DIVISIONS / 2) return 'eighth'
  return '16th'
}

function noteXml(pitchMidi: number, duration: number, isChord = false): string {
  const { step, alter, octave } = parseNoteName(pitchMidi)
  const alterXml = alter ? `<alter>${alter}</alter>` : ''
  const chordXml = isChord ? '<chord/>' : ''
  return `<note>${chordXml}<pitch><step>${step}</step>${alterXml}<octave>${octave}</octave></pitch><duration>${duration}</duration><type>${noteType(duration)}</type></note>`
}

function restXml(duration: number): string {
  return `<note><rest/><duration>${duration}</duration><type>${noteType(duration)}</type></note>`
}

type TimedEvent =
  | { kind: 'chord'; startBeat: number; pitches: number[]; durationBeats: number }
  | { kind: 'rest'; startBeat: number; durationBeats: number }

/** Group simultaneous notes, then fill gaps with rests (in beats). */
function notesToEvents(notes: MelodyNote[], tempoBpm: number): TimedEvent[] {
  if (notes.length === 0) {
    return [{ kind: 'rest', startBeat: 0, durationBeats: 4 }]
  }

  const sorted = [...notes].sort(
    (a, b) =>
      a.startTimeSeconds - b.startTimeSeconds || a.pitchMidi - b.pitchMidi,
  )

  type Group = {
    start: number
    duration: number
    pitches: number[]
  }
  const groups: Group[] = []

  for (const note of sorted) {
    const last = groups[groups.length - 1]
    if (last && Math.abs(note.startTimeSeconds - last.start) < TIME_EPS) {
      last.pitches.push(note.pitchMidi)
      last.duration = Math.max(last.duration, note.durationSeconds)
    } else {
      groups.push({
        start: note.startTimeSeconds,
        duration: note.durationSeconds,
        pitches: [note.pitchMidi],
      })
    }
  }

  const events: TimedEvent[] = []
  let cursor = 0

  for (const g of groups) {
    const startBeat = g.start * (tempoBpm / 60)
    const gap = startBeat - cursor
    if (gap > TIME_EPS) {
      events.push({ kind: 'rest', startBeat: cursor, durationBeats: gap })
    }
    const durationBeats = Math.max(
      1 / DIVISIONS,
      g.duration * (tempoBpm / 60),
    )
    events.push({
      kind: 'chord',
      startBeat,
      pitches: g.pitches,
      durationBeats,
    })
    cursor = startBeat + durationBeats
  }

  return events
}

function eventsToMeasures(events: TimedEvent[], tempoBpm: number): string {
  const measures: string[][] = []
  let current: string[] = []
  let used = 0

  const pushMeasure = () => {
    if (current.length === 0) {
      current.push(restXml(MEASURE_CAPACITY))
    }
    measures.push(current)
    current = []
    used = 0
  }

  const emitRestDiv = (div: number) => {
    let remaining = Math.max(0, Math.round(div))
    while (remaining > 0) {
      const space = MEASURE_CAPACITY - used
      if (space === 0) {
        pushMeasure()
        continue
      }
      const take = Math.min(space, remaining)
      current.push(restXml(take))
      used += take
      remaining -= take
      if (used >= MEASURE_CAPACITY) pushMeasure()
    }
  }

  const emitChord = (pitches: number[], durationBeats: number) => {
    let remaining = Math.max(1, Math.round(durationBeats * DIVISIONS))
    let firstSlice = true
    while (remaining > 0) {
      const space = MEASURE_CAPACITY - used
      if (space === 0) {
        pushMeasure()
        continue
      }
      const take = Math.min(space, remaining)
      pitches.forEach((pitch, i) => {
        current.push(noteXml(pitch, take, !firstSlice || i > 0))
      })
      firstSlice = false
      used += take
      remaining -= take
      if (used >= MEASURE_CAPACITY) pushMeasure()
    }
  }

  for (const event of events) {
    if (event.kind === 'rest') {
      emitRestDiv(event.durationBeats * DIVISIONS)
    } else {
      emitChord(event.pitches, event.durationBeats)
    }
  }

  if (current.length > 0 || measures.length === 0) {
    if (used < MEASURE_CAPACITY && current.length > 0) {
      current.push(restXml(MEASURE_CAPACITY - used))
    }
    pushMeasure()
  }

  return measures
    .map((notesXml, i) => {
      const attrs =
        i === 0
          ? `<attributes><divisions>${DIVISIONS}</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes><direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${tempoBpm}</per-minute></metronome></direction-type><sound tempo="${tempoBpm}"/></direction>`
          : ''
      return `<measure number="${i + 1}">${attrs}${notesXml.join('')}</measure>`
    })
    .join('')
}

function padPartToMeasureCount(measureXml: string, count: number): string {
  const existing = measureXml.match(/<measure /g)?.length ?? 0
  if (existing >= count) return measureXml

  const extras: string[] = []
  for (let i = existing; i < count; i++) {
    extras.push(
      `<measure number="${i + 1}">${restXml(MEASURE_CAPACITY)}</measure>`,
    )
  }
  return measureXml + extras.join('')
}

function countMeasures(measureXml: string): number {
  return measureXml.match(/<measure /g)?.length ?? 0
}

export type ScorePart = {
  id: string
  name: string
  notes: MelodyNote[]
}

/**
 * Convert melody MIDI notes to a minimal MusicXML partwise score.
 */
export function melodyNotesToMusicXml(
  notes: MelodyNote[],
  tempoBpm = estimateTempoBpm(notes),
): string {
  return compositionToMusicXml(
    [{ id: 'P1', name: 'Melody', notes }],
    tempoBpm,
    'Hexa Melody',
  )
}

/** Multi-part MusicXML (melody + accompaniment). */
export function compositionToMusicXml(
  parts: ScorePart[],
  tempoBpm: number,
  title = 'Hexa Composition',
): string {
  const safeParts =
    parts.length > 0
      ? parts
      : [{ id: 'P1', name: 'Melody', notes: [] as MelodyNote[] }]

  const partMeasures = safeParts.map((part) => {
    const events = notesToEvents(part.notes, tempoBpm)
    return eventsToMeasures(events, tempoBpm)
  })

  const maxMeasures = Math.max(1, ...partMeasures.map(countMeasures))
  const padded = partMeasures.map((xml) => padPartToMeasureCount(xml, maxMeasures))

  const partList = safeParts
    .map(
      (p) =>
        `<score-part id="${p.id}"><part-name>${escapeXml(p.name)}</part-name></score-part>`,
    )
    .join('')

  const partBodies = safeParts
    .map((p, i) => `<part id="${p.id}">${padded[i]}</part>`)
    .join('\n  ')

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work><work-title>${escapeXml(title)}</work-title></work>
  <part-list>
    ${partList}
  </part-list>
  ${partBodies}
</score-partwise>`
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
