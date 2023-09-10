const { ipcMain } = require('electron')
const { exec } = require('child_process');
const { Script } = require('vm');

let qvpInsallProcess;

ipcMain.on('run-script', (event, arg) => {
  console.log("executing script", arg)
  event.sender.send('install-complete', 'success')
})

ipcMain.on('execute-script', (event, arg) => {
  console.log("executing script", arg.join(' '))
  
  if (qvpInsallProcess) {
    qvpInsallProcess.kill('SIGTERM');
  }

  qvpInsallProcess = exec(arg.join(' '));
  qvpInsallProcess.stdout.on('data', (data) => {
    event.sender.send('script-output', data);
  });

  qvpInsallProcess.stderr.on('data', (data) => {
    event.sender.send('script-output', data);
  });

  qvpInsallProcess.on('close', (code) => {
    event.sender.send('script-exit', code);
  });
});