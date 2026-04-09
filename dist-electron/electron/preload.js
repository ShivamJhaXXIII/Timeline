import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('electronAPI', {
    getActiveWindow: async () => {
        return ipcRenderer.invoke('window:getActive');
    },
    onActiveWindow: (cb) => {
        const listener = (_, info) => cb(info);
        ipcRenderer.on('window:update', listener);
        return () => ipcRenderer.removeListener('window:update', listener);
    },
});
