const {
  BrowserWindow,
  Menu,
  MenuItem,
  ipcMain,
  app
} = require('electron')

// const { mainWindow } = require('main.js')

const menu = new Menu()
menu.append(new MenuItem({ label: 'Clear', click: () => clearClicked()}))
menu.append(new MenuItem({ type: 'separator' }))
menu.append(new MenuItem({ label: 'Electron', type: 'checkbox', checked: true }))

function clearClicked() {
  console.log('Clear clicked')
  // mainWindow.webContents.send('clear-launch-window-event', 'Clear button clicked')
}


app.on('browser-window-created', (event, win) => {
  win.webContents.on('context-menu', (e, params) => {
    menu.popup(win, params.x, params.y)
  })
})

ipcMain.on('show-context-menu', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  menu.popup(win)
})
