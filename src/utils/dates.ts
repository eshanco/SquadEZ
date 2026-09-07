export function formatEventDateTime(ms: number) {
  return new Date(ms).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function toDateTimeLocalInputValue(ms: number) {
  const date = new Date(ms - new Date().getTimezoneOffset() * 60000)
  return date.toISOString().slice(0, 16)
}

export function fromDateTimeLocalInputValue(value: string) {
  return new Date(value).getTime()
}

export function roundUpToNextHour(ms: number) {
  const HOUR_MS = 60 * 60 * 1000
  return Math.ceil(ms / HOUR_MS) * HOUR_MS
}
