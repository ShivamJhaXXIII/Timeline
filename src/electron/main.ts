import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import { getPreloadPath } from './PathResolver.js'
import { IdleTracker } from './IdleTracker.js'
import { WindowTracker } from './WindowTracker.js'
import {
    DEFAULT_IDLE_THRESHOLD_SECONDS,
    IDLE_POLL_INTERVAL_MS,
    MAIN_WINDOW_HEIGHT,
    MAIN_WINDOW_WIDTH,
    WINDOW_UPDATE_INTERVAL_MS,
} from './config/constants.js'

let mainWindow: BrowserWindow | null = null
const tracker = new WindowTracker()
const idleTracker = new IdleTracker({
    pollIntervalMs: IDLE_POLL_INTERVAL_MS,
    idleThresholdSeconds: DEFAULT_IDLE_THRESHOLD_SECONDS,
})

// Creates the single application window and loads either dev server or built files.
function createWindow() {
    mainWindow = new BrowserWindow({
        width: MAIN_WINDOW_WIDTH,
        height: MAIN_WINDOW_HEIGHT,
        webPreferences: {
            preload: getPreloadPath(),
            contextIsolation: true,
            nodeIntegration: false
        }
    })

    if (app.isPackaged) {
        const indexPath = path.join(app.getAppPath(), 'dist', 'index.html')
        mainWindow.loadFile(indexPath)
    } else {
        mainWindow.loadURL('http://localhost:5173/')
    }

    idleTracker.attachWindow(mainWindow)
    idleTracker.start()

    mainWindow.on('closed', () => {
        idleTracker.attachWindow(null)
    })
}

app.whenReady().then(() => {
    createWindow()

    // Request/response IPC endpoint: renderer asks for current active window once.
    ipcMain.handle('window:getActive', async () => {
        return tracker.getActiveWindow()
    })

    ipcMain.handle('idle:get', async () => {
        return idleTracker.getIdleInfo()
    })

    // Push-style IPC: send active-window updates every second to renderer subscribers.
    const poll = setInterval(async () => {
        if (!mainWindow || mainWindow.isDestroyed()) return
        const info = await tracker.getActiveWindow()
        mainWindow.webContents.send('window:update', info)
    }, WINDOW_UPDATE_INTERVAL_MS)

    app.on('before-quit', () => {
        clearInterval(poll)
        idleTracker.stop()
    })
})

app.on('window-all-closed', () => {
    // Keep macOS-style behavior: apps stay open until user quits explicitly.
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    // Re-create window when dock icon is clicked and no windows are open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})