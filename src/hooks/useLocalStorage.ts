import { useEffect, useState } from 'react'
import { loadJson, saveJson } from '../lib/storage'

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => loadJson<T>(key) ?? initial)

  useEffect(() => {
    saveJson(key, value)
  }, [key, value])

  return [value, setValue] as const
}
