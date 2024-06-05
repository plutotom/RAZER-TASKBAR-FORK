import { app, BrowserWindow, ipcMain } from 'electron';
import { RazerWatcher } from './watcher/razer_watcher';
import TrayManager from './tray_manager';
import { loadSettings, settingsChanges } from './settings_manager';

// This allows TypeScript to pick up the magic constants that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

let isIntentionalQuit = false;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  quit();
}

app.on('will-quit', e => {
  if (!isIntentionalQuit) {
    e.preventDefault();
  }
});

const createSettingsWindow = (): void => {
  // Focus current window if it is open already.
  if (BrowserWindow.getAllWindows().length > 0) {
    BrowserWindow.getAllWindows()[0].focus();
    return;
  }

  // Create the browser window.
  const settingsWindow = new BrowserWindow({
    height: 600,
    width: 800,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
    resizable: false,
    center: true,
    fullscreenable: false,
  });
  settingsWindow.removeMenu();
  // mainWindow.webContents.openDevTools();
  settingsWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  let razerWatcher: RazerWatcher = null;
  ipcMain.handle('getDevices', () => { return razerWatcher.listDevices(); });

  const trayManager = new TrayManager([
    // { label: 'Reconnect', type: 'normal', click: () => razerWatcher.stopAndStart() },
    { label: 'Settings', type: 'normal', click: () => createSettingsWindow() },
    { label: 'Quit', type: 'normal', click: () => quit() }
  ]);

  let isFirstTimeLaunch = false;
  settingsChanges.on('_defaultSettingsCreated', () => isFirstTimeLaunch = true);
  settingsChanges.on('runAtStartup', async value => app.setLoginItemSettings({ openAtLogin: value }));
  settingsChanges.on('displayChargingState', () => trayManager.updateTrayContents());
  await loadSettings();

  razerWatcher = new RazerWatcher(trayManager);
  razerWatcher.initialize();
  razerWatcher.stopAndStart();

  if (isFirstTimeLaunch) { createSettingsWindow(); }
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
// app.on('window-all-closed', () => {
//   if (process.platform !== 'darwin') {
//     app.quit();
//   }
// });

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createSettingsWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

function quit() {
  if (process.platform !== 'darwin') {
    isIntentionalQuit = true;
    app.quit();
  }
}