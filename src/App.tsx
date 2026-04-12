import { useEffect, useState } from "react";
import './App.css'
import type { IdleInfo } from "./electron/types/IdleInfo";
import type { WindowInfo } from "./electron/types/WindowInfo";

function App() {
  const [info, setInfo] = useState<WindowInfo | null>(null)
  const [idleInfo, setIdleInfo] = useState<IdleInfo | null>(null)
  const [screenshotState, setScreenshotState] = useState<any>(null)

  useEffect(() => {
    const api = (window as any).electronAPI
    if(!api) return
    api.getIdleInfo?.().then((i: IdleInfo) => setIdleInfo(i))
    const unsubscribeIdle = api.onIdleUpdate?.((i: IdleInfo) => setIdleInfo(i))
    return unsubscribeIdle
  }, [])

  useEffect(() => {
    const api = (window as any).electronAPI
    if(!api) return
    api.getActiveWindow?.().then((i: WindowInfo | null) => setInfo(i))
    const unsubscribe = api.onActiveWindow?.((i: WindowInfo | null) => setInfo(i))
    return unsubscribe
  }, [])

  useEffect(() => {
    const api = (window as any).electronAPI
    if(!api) return
    api.getScreenshotServiceStatus?.().then(setScreenshotState)
  }, [])

  return (
    <div className="app-shell">
      <h1 className="app-title">
        Active Window
      </h1>
      {!(window as any).electronAPI && (
        <div className="app-warning">Running in browser - Electron API not available</div>
      )}
      <div className="section-block">
        <div><strong>Title:</strong> {info?.title ?? '-'}</div>
        <div><strong>App:</strong> {info?.app ?? '-'}</div>
        <div><strong>Owner:</strong> {info?.owner ?? '-'}</div>
        <div><strong>PID:</strong> {info?.pid ?? '-'}</div>
      </div>

      <h2 className="section-title">Idle Status</h2>
      <div className="section-block">
        <div><strong>Status:</strong> {idleInfo?.status ?? '-'}</div>
        <div><strong>Idle Seconds:</strong> {idleInfo?.idleSeconds ?? '-'}</div>
        <div><strong>Threshold:</strong> {idleInfo?.thresholdSeconds ?? '-'}s</div>
        <div><strong>Is Idle:</strong> {idleInfo ? String(idleInfo.isIdle) : '-'}</div>
      </div>

      <div className="action-row">
        <button onClick={() => (window as any).electronAPI.getActiveWindow?.().then(setInfo)}>Refresh</button>
        <span className="helper-text">Auto-updates every second via IPC</span>
      </div>

      <h2 className="section-title">Screenshot Service</h2>
      <div className="section-block">
        <div><strong>Running:</strong> {screenshotState ? String(screenshotState.running) : '-'}</div>
        <div><strong>Output Dir:</strong> {screenshotState?.outputDir ?? '-'}</div>
        <div><strong>Interval:</strong> {screenshotState?.intervalMs ? `${screenshotState.intervalMs}ms` : '-'}</div>
        <div><strong>Next Capture:</strong> {screenshotState?.nextCaptureInMs ?? '-'}</div>
        <div><strong>Last Capture:</strong> {screenshotState?.lastCaptureAt ?? '-'}</div>
        <div><strong>Last File:</strong> {screenshotState?.lastCapturePath ?? '-'}</div>
        <div><strong>Last Error:</strong> {screenshotState?.lastError ?? '-'}</div>
      </div>

      <div className="action-row">
        <button onClick={() => (window as any).electronAPI.startScreenshotService?.().then(setScreenshotState)}>Start Capture</button>
        <button onClick={() => (window as any).electronAPI.stopScreenshotService?.().then(setScreenshotState)}>Stop Capture</button>
        <button onClick={() => (window as any).electronAPI.getScreenshotServiceStatus?.().then(setScreenshotState)}>Refresh Capture State</button>
      </div>
    </div>
  )

}

export default App