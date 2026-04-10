"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron = require('electron');
// Preload runs in an isolated context and exposes a narrow, safe API surface.
electron.contextBridge.exposeInMainWorld('electronAPI', {
    // One-time fetch for currently active window information.
    getActiveWindow: async () => {
        return electron.ipcRenderer.invoke('window:getActive');
    },
    // Subscribes to periodic updates; returns an unsubscribe function for cleanup.
    onActiveWindow: (cb) => {
        const listener = (_, info) => cb(info);
        electron.ipcRenderer.on('window:update', listener);
        return () => electron.ipcRenderer.removeListener('window:update', listener);
    },
});
