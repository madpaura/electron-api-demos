const { BrowserWindow, ipcMain } = require('electron')
const fs = require("fs");
const { exec } = require('child_process')
const os = require('os');
const { event } = require('jquery');
const { SocketAddress } = require('net');
const { argv } = require('process');

let process = ""

function executeShellCmd(cmd, event, error_event, success_event, data_event) {
  process = exec(cmd);
  process.stdout.on('data', (data) => {
    event.sender.send(data_event, data);
  });

  process.stderr.on('data', (data) => {
    event.sender.send(error_event, data);
  });

  process.on('close', (code) => {
    event.sender.send(success_event, code);
  });
}

ipcMain.on('start-coverage', (event, args) => {
  console.log("start code coverage :", args[0], args[1]);
  const cmd = args[0]
  executeShellCmd(cmd, event, 'coverage-failed', 'coverage-started', 'coverage-script-output');
});


ipcMain.on('stop-coverage', (event, args) => {
  const cmd = args[0]
  console.log("stop code coverage :", cmd);

  executeShellCmd(cmd, event, 'coverage-failed', 'coverage-stopped', 'coverage-script-output');
});


ipcMain.on('get-coverage-report', (event, args) => {

  const cmd = args[0]
  console.log("view code coverage :", cmd, args);

  executeShellCmd(cmd, event, 'coverage-failed', 'coverage-report', 'coverage-script-output');

});

ipcMain.on('updated-cores-ui', (event) => {
  event.sender.send('update-progress-bar');
});



