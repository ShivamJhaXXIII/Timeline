import { useEffect, useState } from "react";
import './App.css'
import type { WindowInfo } from "./electron/types/WindowInfo";

function App() {
  const [info, setInfo] = useState<WindowInfo | null>(null)
  const [polling, setPolling] = useState(false)

  useEffect(() => {
    const api = (window as any).electronAPI
    if(!api) return
    api.getActiveWindow?.().then((i: WindowInfo | null) => setInfo(i))
    const unsubscribe = api.onActiveWindow?.((i: WindowInfo | null) => setInfo(i))
    return unsubscribe
  }, [])

  useEffect(() => {
    let t: number | undefined
    const api = (window as any).electronAPI
    if (polling && api?.getActiveWindow) {
      t = window.setInterval(() => api.getActiveWindow().then((i: WindowInfo | null) => setInfo(i)), 1000)

    }
    return () => { if (t) clearInterval(t)}
  }, [polling])

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

      <div style={{marginTop: 12}}>
        <button onClick={() => (window as any).electronAPI.getActiveWindow?.().then(setInfo)}>Refresh</button>
        <label style={{marginLeft: 12}}>
          <input type="checkbox" checked={polling} onChange={e => setPolling(e.target.checked)}/>Poll every Second
        </label>
      </div>
    </div>
  )

}

export default App