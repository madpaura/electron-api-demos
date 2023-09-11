const { ipcMain } = require('electron')

// Handle navigation events from the renderer process
ipcMain.on('navigate-tab', (event, tab) => {
  event.sender.send('navigate-tab', tab);
});
