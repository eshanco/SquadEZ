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
