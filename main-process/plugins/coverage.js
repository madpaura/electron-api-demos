const { BrowserWindow, ipcMain } = require('electron')
const fs = require("fs");
const { exec } = require('child_process')
const os = require('os');
const { event } = require('jquery');
const { SocketAddress } = require('net');
const { argv } = require('process');
const path = require('path')
const { app } = require('electron');

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

function SendCovInfo(event, reportpath) {
  let coreList = []
  const directoryPath = app.getAppPath() + "/" + reportpath;
  fs.readdir(directoryPath, { withFileTypes: true }, (err, entries) => {
    if (err) {
      console.error('Error reading directory:', err);
      event.sender.send('coverage-report', -1, err);
      return;
    }

    const cores = entries.filter(entry => entry.isDirectory());
    cores.forEach(core => {
      let coreInfo = {}
      const html = path.join(directoryPath, core.name) + "/index.html";

      coreInfo['filepath'] = html;
      coreInfo['name'] = core.name;
      console.log(coreInfo)

      coreList.push(coreInfo)
    });
    event.sender.send('coverage-report', 0, coreList);
  });
}

ipcMain.on('get-coverage-report', (event, args) => {

  const cmd = args[0]
  console.log("view code coverage :", cmd, args);

  process = exec(cmd);
  process.stdout.on('data', (data) => {
    event.sender.send('coverage-script-output', data);
  });

  process.stderr.on('data', (data) => {
    event.sender.send('coverage-failed', data);
  });

  process.on('close', (code) => {
    if( code != 0) {
      event.sender.send('coverage-report', code, null);
      return;
    }
    SendCovInfo(event, args[1]);
  });
});

ipcMain.on('updated-cores-ui', (event) => {
  event.sender.send('update-progress-bar');
});



