import { useCallback, useRef, useState } from 'react'

export type RecorderStatus = 'idle' | 'recording' | 'stopped' | 'error'

export function useRecorder() {
  const [status, setStatus] = useState<RecorderStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  const start = useCallback(async () => {
    setError(null)
    setAudioBlob(null)
    chunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : ''

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)

      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onerror = () => {
        setStatus('error')
        setError('녹음 중 오류가 발생했습니다.')
        stopStream()
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        })
        setAudioBlob(blob)
        setStatus('stopped')
        stopStream()
        console.log('[recorder] blob', blob.type, blob.size)
      }

      recorder.start()
      setStatus('recording')
    } catch (err) {
      console.error('[recorder]', err)
      setStatus('error')
      setError(
        '마이크 권한이 필요합니다. 브라우저에서 마이크를 허용해 주세요.',
      )
      stopStream()
    }
  }, [])

  const stop = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state === 'recording') {
      recorder.stop()
    }
  }, [])

  return { status, error, audioBlob, start, stop }
}
