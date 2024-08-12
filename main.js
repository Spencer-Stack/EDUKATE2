// main.js

const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        fullscreen: true,
        webPreferences: {
            nodeIntegration: true, // Required for SerialPort
            contextIsolation: false,
        }
    });

    // Load the index.html of the app.
    mainWindow.loadFile('index.html');

    // Open the DevTools (optional).
    mainWindow.webContents.openDevTools();
}

// This method will be called when Electron has finished initialization and is ready to create browser windows.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS.
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
