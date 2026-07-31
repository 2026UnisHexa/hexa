import type { LyricsSuggestion } from '../types/lyrics'

/** Wrap source text into ~4 lines (mirrors server fallback). */
export function formatTextAsFallbackLyrics(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned) return '가사를 만들지 못했습니다.'

  const words = cleaned.split(' ')
  const lines: string[] = []
  let current = ''
  const targetLines = 4
  const perLine = Math.max(1, Math.ceil(words.length / targetLines))

  for (const word of words) {
    if (!current) {
      current = word
    } else if (
      current.split(' ').length >= perLine &&
      lines.length < targetLines - 1
    ) {
      lines.push(current)
      current = word
    } else {
      current = `${current} ${word}`
    }
  }
  if (current) lines.push(current)
  return lines.join('\n')
}

export function getFallbackLyricsSuggestions(text: string): LyricsSuggestion[] {
  return [
    {
      title: '원본 그대로',
      lyrics: formatTextAsFallbackLyrics(text),
    },
  ]
}
