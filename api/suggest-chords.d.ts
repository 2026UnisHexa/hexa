import type { IncomingMessage, ServerResponse } from 'node:http'

export function validateSuggestChordsBody(
  body: unknown,
):
  | { ok: true; melodySummary: string }
  | { ok: false; status: number; error: string }

export function callClaudeForChords(
  melodySummary: string,
  apiKey: string,
): Promise<string>

export function handleSuggestChords(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse,
): Promise<void>

declare function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse,
): Promise<void>

export default handler
