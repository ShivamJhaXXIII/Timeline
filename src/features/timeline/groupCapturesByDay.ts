import type { CaptureRecord } from '../../types/electronApi.js'

export type TimelineGroup = {
  dateKey: string
  dateLabel: string
  items: CaptureRecord[]
}

export function groupCapturesByDay(captures: CaptureRecord[]): TimelineGroup[] {
  const byDate = new Map<string, CaptureRecord[]>()

  for (const capture of captures) {
    const date = new Date(capture.capturedAt)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

    const existing = byDate.get(key)
    if (existing) {
      existing.push(capture)
    } else {
      byDate.set(key, [capture])
    }
  }

  return Array.from(byDate.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([dateKey, items]) => ({
      dateKey,
      dateLabel: new Date(`${dateKey}T00:00:00`).toLocaleDateString(),
      items: items.sort((a, b) => (a.capturedAt < b.capturedAt ? 1 : -1)),
    }))
}
