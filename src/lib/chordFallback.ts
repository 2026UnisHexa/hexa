import type { ChordSuggestion } from '../types/chord'

/** Demo-safe hardcoded progressions when OpenAI JSON parse fails. */
export const FALLBACK_CHORD_SUGGESTIONS: ChordSuggestion[] = [
  {
    label: '안정적인 팝 진행 (fallback)',
    chords: [
      { name: 'C', notes: ['C4', 'E4', 'G4'] },
      { name: 'Am', notes: ['A3', 'C4', 'E4'] },
      { name: 'F', notes: ['F3', 'A3', 'C4'] },
      { name: 'G', notes: ['G3', 'B3', 'D4'] },
    ],
  },
  {
    label: '밝은 메이저 진행 (fallback)',
    chords: [
      { name: 'C', notes: ['C4', 'E4', 'G4'] },
      { name: 'G', notes: ['G3', 'B3', 'D4'] },
      { name: 'Am', notes: ['A3', 'C4', 'E4'] },
      { name: 'F', notes: ['F3', 'A3', 'C4'] },
    ],
  },
  {
    label: '부드러운 진행 (fallback)',
    chords: [
      { name: 'Am', notes: ['A3', 'C4', 'E4'] },
      { name: 'F', notes: ['F3', 'A3', 'C4'] },
      { name: 'C', notes: ['C4', 'E4', 'G4'] },
      { name: 'G', notes: ['G3', 'B3', 'D4'] },
    ],
  },
]
