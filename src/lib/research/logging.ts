type LogLevel = 'info' | 'warn' | 'error'

export function logResearchEvent(
  level: LogLevel,
  event: string,
  payload: Record<string, unknown> = {}
) {
  const line = JSON.stringify({
    namespace: 'research-intelligence',
    level,
    event,
    timestamp: new Date().toISOString(),
    ...payload,
  })

  if (level === 'error') {
    console.error(line)
    return
  }

  if (level === 'warn') {
    console.warn(line)
    return
  }

  console.info(line)
}
