const PREFIX = 'hexa:'

export function saveJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value))
  } catch {
    // ignore quota / private mode
  }
}

export function loadJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`${PREFIX}${key}`)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}
