import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { WindowInfo } from './types/WindowInfo.js';

contextBridge.exposeInMainWorld('electronAPI', {
  getActiveWindow: async (): Promise<WindowInfo | null> => {
    return ipcRenderer.invoke('window:getActive');
  },
  onActiveWindow: (cb: (info: WindowInfo | null) => void) => {
    const listener = (_: IpcRendererEvent, info: WindowInfo | null) => cb(info);
    ipcRenderer.on('window:update', listener);
    return () => ipcRenderer.removeListener('window:update', listener);
  },
});