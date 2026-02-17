type LogLevel = 'info' | 'warn' | 'error'

type LogPayload = {
  event: string
  [key: string]: unknown
}

export function log(level: LogLevel, payload: LogPayload) {
  const entry = {
    level,
    timestamp: new Date().toISOString(),
    ...payload
  }

  const serialized = JSON.stringify(entry)

  if (level === 'error') {
    console.error(serialized)
    return
  }

  if (level === 'warn') {
    console.warn(serialized)
    return
  }

  console.log(serialized)
}
