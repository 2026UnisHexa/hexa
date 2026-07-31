import type { MelodyNote } from '../types/midi'
import { estimateTempoBpm, midiToNoteName } from '../utils/melodySummary'

const DIVISIONS = 4 // quarter note = 4

function durationToDivisions(durationSeconds: number, tempoBpm: number): number {
  const beats = durationSeconds * (tempoBpm / 60)
  const div = Math.max(1, Math.round(beats * DIVISIONS))
  return Math.min(div, DIVISIONS * 4)
}

function parseNoteName(pitchMidi: number): { step: string; alter: number; octave: number } {
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

function noteXml(
  pitchMidi: number,
  duration: number,
  isChord = false,
): string {
  const { step, alter, octave } = parseNoteName(pitchMidi)
  const alterXml = alter ? `<alter>${alter}</alter>` : ''
  const chordXml = isChord ? '<chord/>' : ''
  const type =
    duration >= DIVISIONS * 2
      ? 'half'
      : duration >= DIVISIONS
        ? 'quarter'
        : duration >= DIVISIONS / 2
          ? 'eighth'
          : '16th'

  return `<note>${chordXml}<pitch><step>${step}</step>${alterXml}<octave>${octave}</octave></pitch><duration>${duration}</duration><type>${type}</type></note>`
}

function restXml(duration: number): string {
  const type =
    duration >= DIVISIONS * 2
      ? 'half'
      : duration >= DIVISIONS
        ? 'quarter'
        : duration >= DIVISIONS / 2
          ? 'eighth'
          : '16th'
  return `<note><rest/><duration>${duration}</duration><type>${type}</type></note>`
}

/**
 * Convert melody MIDI notes to a minimal MusicXML partwise score.
 */
export function melodyNotesToMusicXml(
  notes: MelodyNote[],
  tempoBpm = estimateTempoBpm(notes),
): string {
  const sorted = [...notes].sort(
    (a, b) => a.startTimeSeconds - b.startTimeSeconds,
  )

  const measureCapacity = DIVISIONS * 4
  const measures: string[][] = []
  let current: string[] = []
  let used = 0
  let cursorBeats = 0

  const pushMeasure = () => {
    if (current.length === 0) {
      current.push(restXml(measureCapacity))
    }
    measures.push(current)
    current = []
    used = 0
  }

  for (const note of sorted) {
    const startBeat = note.startTimeSeconds * (tempoBpm / 60)
    let gapBeats = startBeat - cursorBeats
    if (gapBeats < 0) gapBeats = 0

    // fill rests for gap
    let gapDiv = Math.round(gapBeats * DIVISIONS)
    while (gapDiv > 0) {
      const space = measureCapacity - used
      const take = Math.min(space, gapDiv)
      if (take > 0) {
        current.push(restXml(take))
        used += take
        gapDiv -= take
      }
      if (used >= measureCapacity) pushMeasure()
    }

    let dur = durationToDivisions(note.durationSeconds, tempoBpm)
    while (dur > 0) {
      const space = measureCapacity - used
      if (space === 0) {
        pushMeasure()
        continue
      }
      const take = Math.min(space, dur)
      current.push(noteXml(note.pitchMidi, take))
      used += take
      dur -= take
      if (used >= measureCapacity) pushMeasure()
    }

    cursorBeats =
      note.startTimeSeconds * (tempoBpm / 60) +
      note.durationSeconds * (tempoBpm / 60)
  }

  if (current.length > 0 || measures.length === 0) {
    if (used < measureCapacity && current.length > 0) {
      current.push(restXml(measureCapacity - used))
    }
    pushMeasure()
  }

  const measureXml = measures
    .map((notesXml, i) => {
      const attrs =
        i === 0
          ? `<attributes><divisions>${DIVISIONS}</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes><direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${tempoBpm}</per-minute></metronome></direction-type><sound tempo="${tempoBpm}"/></direction>`
          : ''
      return `<measure number="${i + 1}">${attrs}${notesXml.join('')}</measure>`
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work><work-title>Hexa Melody</work-title></work>
  <part-list>
    <score-part id="P1"><part-name>Melody</part-name></score-part>
  </part-list>
  <part id="P1">
    ${measureXml}
  </part>
</score-partwise>`
}
