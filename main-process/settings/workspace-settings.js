const { ipcMain } = require('electron')

// Handle navigation events from the renderer process
ipcMain.on('navigate-tab', (event, tab) => {
  event.sender.send('navigate-tab', tab);
});

ipcMain.on('config-file-changed', (event, path) => {
  event.sender.send('config-file-changed', path);
});
