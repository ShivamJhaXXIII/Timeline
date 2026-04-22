const electron = require('electron')
import type { IdleInfo } from './types/IdleInfo.js';
import type { WindowInfo } from './types/WindowInfo.js';
import type { CaptureListQuery, CaptureRecord } from './captureRepository.js';
import type { ScreenshotServiceState } from './screenshotService.js';

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
  getScreenshotServiceStatus: async () => {
    return electron.ipcRenderer.invoke('screenshot:status') as Promise<ScreenshotServiceState>;
  },
  startScreenshotService: async () => {
    return electron.ipcRenderer.invoke('screenshot:start') as Promise<ScreenshotServiceState>;
  },
  stopScreenshotService: async () => {
    return electron.ipcRenderer.invoke('screenshot:stop') as Promise<ScreenshotServiceState>;
  },
  getCaptures: async (query: CaptureListQuery = {}): Promise<CaptureRecord[]> => {
    return electron.ipcRenderer.invoke('captures:list', query);
  },
});
