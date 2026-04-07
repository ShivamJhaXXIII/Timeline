import { app, BrowserWindow} from 'electron'

let mainWindow

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600
    })
    mainWindow.loadURL("http://localhost:5173/")
}

app.whenReady().then(createWindow)