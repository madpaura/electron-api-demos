const { ipcMain } = require('electron')
const { exec } = require('child_process');
const { Script } = require('vm');

let qvpInsallProcess;

ipcMain.on('download-complete', (event, data) => {
  console.log("download compelte", data)
  event.sender.send('setup-install-options', data)
})

ipcMain.on('execute-script', (event, arg) => {
  console.log("executing script", arg.join(' '))
  
  if (qvpInsallProcess) {
    qvpInsallProcess.kill('SIGTERM');
  }

  qvpInsallProcess = exec(arg.join(' '));
  qvpInsallProcess.stdout.on('data', (data) => {
    event.sender.send('install-output', data);
  });

  qvpInsallProcess.stderr.on('data', (data) => {
    event.sender.send('install-output', data);
  });

  qvpInsallProcess.on('close', (code) => {
    event.sender.send('install-complete', code);
  });
});