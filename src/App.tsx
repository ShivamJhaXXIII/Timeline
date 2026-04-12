import { useEffect, useState } from "react";
import './App.css'
import type { IdleInfo } from "./electron/types/IdleInfo";
import type { WindowInfo } from "./electron/types/WindowInfo";

function App() {
  const [info, setInfo] = useState<WindowInfo | null>(null)
  const [idleInfo, setIdleInfo] = useState<IdleInfo | null>(null)

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

  return (
    <div style={{padding: 20, fontFamily: 'system-ui, sans-serif'}}>
      <h1>
        Active Window
      </h1>
      {!(window as any).electronAPI && (
        <div style={{color: 'orange'}}>Running in browser - Electron API not available</div>
      )}
      <div style={{marginTop: 12}}>
        <div><strong>Title:</strong> {info?.title ?? '-'}</div>
        <div><strong>App:</strong> {info?.app ?? '-'}</div>
        <div><strong>Owner:</strong> {info?.owner ?? '-'}</div>
        <div><strong>PID:</strong> {info?.pid ?? '-'}</div>
      </div>

      <h2 style={{ marginTop: 18 }}>Idle Status</h2>
      <div style={{marginTop: 12}}>
        <div><strong>Status:</strong> {idleInfo?.status ?? '-'}</div>
        <div><strong>Idle Seconds:</strong> {idleInfo?.idleSeconds ?? '-'}</div>
        <div><strong>Threshold:</strong> {idleInfo?.thresholdSeconds ?? '-'}s</div>
        <div><strong>Is Idle:</strong> {idleInfo ? String(idleInfo.isIdle) : '-'}</div>
      </div>

      <div style={{marginTop: 12}}>
        <button onClick={() => (window as any).electronAPI.getActiveWindow?.().then(setInfo)}>Refresh</button>
        <span style={{marginLeft: 12, color: '#666'}}>Auto-updates every second via IPC</span>
      </div>
    </div>
  )

}

export default App