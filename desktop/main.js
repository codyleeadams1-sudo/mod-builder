import { app, BrowserWindow, shell, dialog } from 'electron';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { startServer } from '../server.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

let win;
let localUrl;
let pendingDeepLink = process.argv.find(arg => arg.startsWith('modforge://'));

function urlForDeepLink(raw) {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'modforge:') return null;
    const target = new URL(localUrl);
    for (const [key, value] of parsed.searchParams) target.searchParams.set(key, value);
    return target.toString();
  } catch {
    return localUrl;
  }
}

async function openMainWindow(deepLink) {
  if (!win) {
    win = new BrowserWindow({
      width: 1440,
      height: 960,
      minWidth: 900,
      minHeight: 680,
      show: false,
      backgroundColor: '#0c0e0d',
      autoHideMenuBar: true,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });
    win.once('ready-to-show', () => win.show());
    win.on('closed', () => { win = null; });
    win.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('http://') || url.startsWith('https://')) shell.openExternal(url);
      return { action: 'deny' };
    });
  }
  await win.loadURL(urlForDeepLink(deepLink) || localUrl);
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

if (gotLock) {
  app.on('second-instance', (_event, commandLine) => {
    const deepLink = commandLine.find(arg => arg.startsWith('modforge://'));
    openMainWindow(deepLink).catch(console.error);
  });

  app.on('open-url', (event, url) => {
    event.preventDefault();
    openMainWindow(url).catch(console.error);
  });

  app.whenReady().then(async () => {
    try {
      app.setAsDefaultProtocolClient('modforge');
      const buildRoot = path.join(app.getPath('userData'), 'builds');
      const { port } = await startServer({ port: 0, buildRoot });
      localUrl = `http://127.0.0.1:${port}/`;
      await openMainWindow(pendingDeepLink);
      pendingDeepLink = null;
    } catch (error) {
      console.error('ModForge AI startup failed:', error);
      dialog.showErrorBox(
        'ModForge AI could not start',
        `${error.message}\n\nTry reinstalling ModForge AI. If the problem continues, check whether security software is blocking it.`
      );
      app.quit();
    }
  });

  app.on('activate', () => {
    if (win) win.show();
    else if (localUrl) openMainWindow().catch(console.error);
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
