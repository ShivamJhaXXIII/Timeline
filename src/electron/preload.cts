const electron = require('electron')
import type { IdleInfo } from './types/IdleInfo.js';
import type { WindowInfo } from './types/WindowInfo.js';

// Preload runs in an isolated context and exposes a narrow, safe API surface.
electron.contextBridge.exposeInMainWorld('electronAPI', {
  // One-time fetch for currently active window information.
  getActiveWindow: async (): Promise<WindowInfo | null> => {
    return electron.ipcRenderer.invoke('window:getActive');
  },
  // Subscribes to periodic updates; returns an unsubscribe function for cleanup.
  onActiveWindow: (cb: (info: WindowInfo | null) => void) => {
    const listener = (_: Electron.IpcRendererEvent, info: WindowInfo | null) => cb(info);
    electron.ipcRenderer.on('window:update', listener);
    return () => electron.ipcRenderer.removeListener('window:update', listener);
  },
  getIdleInfo: async (): Promise<IdleInfo> => {
    return electron.ipcRenderer.invoke('idle:get');
  },
  onIdleUpdate: (cb: (info: IdleInfo) => void) => {
    const listener = (_: Electron.IpcRendererEvent, info: IdleInfo) => cb(info);
    electron.ipcRenderer.on('idle:update', listener);
    return () => electron.ipcRenderer.removeListener('idle:update', listener);
  },
});
