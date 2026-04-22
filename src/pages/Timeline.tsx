import { useEffect, useMemo, useState } from 'react'
import type { CaptureListQuery, CaptureRecord } from '../types/electronApi.js'
import { DateHeader } from '../components/timeline/DateHeader.js'
import { ScreenshotCard } from '../components/timeline/ScreenshotCard.js'
import { groupCapturesByDay } from '../features/timeline/groupCapturesByDay.js'

const DEFAULT_QUERY: CaptureListQuery = {
  limit: 100,
  offset: 0,
}

export function Timeline() {
  const [captures, setCaptures] = useState<CaptureRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const grouped = useMemo(() => groupCapturesByDay(captures), [captures])

  useEffect(() => {
    if (!window.electronAPI?.getCaptures) {
      return
    }

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const data = await window.electronAPI.getCaptures(DEFAULT_QUERY)
        setCaptures(data)
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to load captures'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  if (!window.electronAPI) {
    return <p>Electron API is unavailable. Start the desktop app to view timeline data.</p>
  }

  if (loading) {
    return <p>Loading captures…</p>
  }

  if (error) {
    return <p role="alert">{error}</p>
  }

  if (captures.length === 0) {
    return <p>No captures found.</p>
  }

  return (
    <section>
      <h1>Timeline</h1>
      {grouped.map((group) => (
        <div key={group.dateKey}>
          <DateHeader dateLabel={group.dateLabel} count={group.items.length} />
          {group.items.map((capture) => (
            <ScreenshotCard key={capture.id} capture={capture} />
          ))}
        </div>
      ))}
    </section>
  )
}

export default Timeline
