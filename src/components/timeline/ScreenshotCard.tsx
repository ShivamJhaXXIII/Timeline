import type { CaptureRecord } from '../../types/electronApi.js'

type ScreenshotCardProps = {
  capture: CaptureRecord
}

export function ScreenshotCard({ capture }: ScreenshotCardProps) {
  return (
    <article>
      <div>
        <strong>{capture.appName}</strong>
        <span> · {new Date(capture.capturedAt).toLocaleTimeString()}</span>
      </div>
      <div>{capture.windowTitle || 'Untitled window'}</div>
      <code>{capture.screenshotPath}</code>
    </article>
  )
}
