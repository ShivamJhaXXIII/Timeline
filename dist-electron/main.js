import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { getPreloadPath } from './PathResolver';
import { WindowTracker } from './WindowTracker';
let mainWindow = null;
const tracker = new WindowTracker();
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: getPreloadPath(),
            contextIsolation: true,
            nodeIntegration: false
        }
    });
    if (app.isPackaged) {
        const indexPath = path.join(app.getAppPath(), 'dist', 'index.html');
        mainWindow.loadFile(indexPath);
    }
    else {
        mainWindow.loadURL('http://localhost:5173/');
    }
}
app.whenReady().then(() => {
    createWindow();
    ipcMain.handle('window:getActive', async () => {
        return tracker.getActiveWindow();
    });
    const poll = setInterval(async () => {
        if (!mainWindow || mainWindow.isDestroyed())
            return;
        const info = await tracker.getActiveWindow();
        mainWindow.webContents.send('window:update', info);
    }, 1000);
    app.on('before-quit', () => clearInterval(poll));
});
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
