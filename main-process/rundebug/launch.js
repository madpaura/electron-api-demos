const { ipcMain } = require('electron')
const { exec } = require('child_process');
const { Script } = require('vm');

let proc;

ipcMain.on('stop-qvp', (event, arg) => {
  console.log("stop-qvp-cmd", arg)

  if (proc) {
    proc.kill('SIGTERM');
  }

  proc = exec(arg.join(' '));
  proc.stdout.on('data', (data) => {
    event.sender.send('qvp-launch-output', data);
  });

  proc.stderr.on('data', (data) => {
    event.sender.send('qvp-stop-error', data);
  });

  proc.on('close', (code) => {
    event.sender.send('qvp-stop-success', code);
  });

})

ipcMain.on('run-qvp', (event, arg) => {
  console.log("run-qvp", arg)

  if (proc) {
    proc.kill('SIGTERM');
  }

  proc = exec(arg.join(' '));
  proc.stdout.on('data', (data) => {
    event.sender.send('qvp-launch-output', data);
  });

  proc.stderr.on('data', (data) => {
    event.sender.send('qvp-start-error', data);
  });

  proc.on('close', (code) => {
    event.sender.send('qvp-start-success', code);
  });
});


