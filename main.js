// only add update server if it's not being run from cli
if (require.main !== module) {
  require('update-electron-app')({
    logger: require('electron-log')
  })
}

const path = require('path')
const glob = require('glob')
const { app, BrowserWindow, ipcMain } = require('electron')

var debug = /--debug/.test(process.argv[2])

if (process.mas) app.setName('QVP')

let mainWindow = null

function initialize() {
  makeSingleInstance()

  loadDemos()

  function createWindow() {
    const windowOptions = {
      width: 1080,
      minWidth: 680,
      height: 840,
      title: app.getName(),
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        allowRunningInsecureContent: true
      }
    }

    if (process.platform === 'linux') {
      windowOptions.icon = path.join(__dirname, '/assets/app-icon/png/512.png')
    }

    mainWindow = new BrowserWindow(windowOptions)
    mainWindow.loadURL(path.join('file://', __dirname, '/index.html'))

    // Launch fullscreen with DevTools open, usage: npm run debug
    debug = true;
    if (debug) {
      mainWindow.webContents.openDevTools()
      mainWindow.maximize()
      require('devtron').install()
    }

    mainWindow.on('closed', () => {
      mainWindow = null
    })
  }

  app.on('ready', () => {
    createWindow();
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('activate', () => {
    if (mainWindow === null) {
      createWindow()
    }
  })
}

module.exports = {
  mainWindow
}

// Make this app a single instance app.
//
// The main window will be restored and focused instead of a second window
// opened when a person attempts to launch a second instance.
//
// Returns true if the current version of the app should quit instead of
// launching.
function makeSingleInstance() {
  if (process.mas) return

  app.requestSingleInstanceLock()

  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

// Require each JS file in the main-process dir
function loadDemos() {
  const files = glob.sync(path.join(__dirname, 'main-process/**/*.js'))
  files.forEach((file) => { require(file) })
}

let mainWinEvent;

ipcMain.on('sudo-passwd-update', (event) => {
  mainWinEvent = event;
  const modalPath = path.join(__dirname, '/sections/windows/passwd.html')
  passwordDialog = new BrowserWindow({
    frame: false,
    width: 400,
    height: 140,
    modal: true,
    parent: mainWindow,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      allowRunningInsecureContent: true
    }
  })

  passwordDialog.on('close', () => { win = null })
  passwordDialog.loadFile(modalPath)
  passwordDialog.show()

});

ipcMain.on('password-submitted', (event, password) => {
  mainWinEvent.sender.send('password-updated', password)
  passwordDialog.close();
});

initialize()  
