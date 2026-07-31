import type { IncomingMessage, ServerResponse } from 'node:http'

export function validateSuggestLyricsBody(
  body: unknown,
):
  | { ok: true; text: string; genre: string }
  | { ok: false; status: number; error: string }

export function fallbackLyricsFromText(text: string): {
  title: string
  lyrics: string
}

export function callOpenAIForLyrics(
  text: string,
  genre: string,
  apiKey: string,
): Promise<string>

export function handleSuggestLyrics(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse,
): Promise<void>

declare function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse,
): Promise<void>

export default handler
