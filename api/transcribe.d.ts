import type { IncomingMessage, ServerResponse } from 'node:http'

export function callWhisper(file: File, apiKey: string): Promise<string>

export function refineTranscript(raw: string, apiKey: string): Promise<string>

export function handleTranscribe(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void>

declare function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void>

export default handler

export const config: {
  api: {
    bodyParser: false
  }
}
