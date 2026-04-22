import type { IdleInfo } from '../electron/types/IdleInfo.js'
import type { WindowInfo } from '../electron/types/WindowInfo.js'

export type CaptureListQuery = {
  from?: string
  to?: string
  appName?: string
  limit?: number
  offset?: number
}

export type CaptureMetadata = {
  windowTitle: string
  appName: string
  appPath: string | null
  isIdle: boolean
  idleSeconds: number
  idleThresholdSeconds: number
  idleStatus: string
}

export type CaptureRecord = {
  id: string
  capturedAt: string
  screenshotPath: string
  windowTitle: string
  appName: string
  appPath: string | null
  isIdle: boolean
  metadata: CaptureMetadata
  createdAt: string
}

export type ScreenshotServiceState = {
  running: boolean
  outputDir: string | null
  intervalMs: number
  nextCaptureInMs: number | null
  lastCaptureAt: string | null
  lastCapturePath: string | null
  lastError: string | null
}

export type ElectronAPI = {
  getActiveWindow: () => Promise<WindowInfo | null>
  onActiveWindow: (cb: (info: WindowInfo | null) => void) => () => void
  getIdleInfo: () => Promise<IdleInfo>
  onIdleUpdate: (cb: (info: IdleInfo) => void) => () => void
  getScreenshotServiceStatus: () => Promise<ScreenshotServiceState>
  startScreenshotService: () => Promise<ScreenshotServiceState>
  stopScreenshotService: () => Promise<ScreenshotServiceState>
  getCaptures: (query?: CaptureListQuery) => Promise<CaptureRecord[]>
}
