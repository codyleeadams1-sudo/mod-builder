import { app, BrowserWindow, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
let win;
async function createWindow() {
  // Start the local Express app inside Electron; no separate terminal is needed.
  await import(path.join(here, '..', 'server.js'));
  win = new BrowserWindow({ width: 1440, height: 960, minWidth: 900, minHeight: 680,
    backgroundColor: '#0c0e0d', autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.loadURL('http://127.0.0.1:3000');
}
app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
