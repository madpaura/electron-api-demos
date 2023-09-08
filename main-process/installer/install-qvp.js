const {ipcMain} = require('electron')

ipcMain.on('run-script', (event, arg) => {
  console.log("executing script", arg)
  event.sender.send('install-complete', 'success')
})
