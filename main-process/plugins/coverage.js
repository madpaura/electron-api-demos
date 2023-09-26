const { BrowserWindow, ipcMain } = require('electron')
const fs = require("fs");
const { exec } = require('child_process')
const os = require('os');
const { event } = require('jquery');
const { SocketAddress } = require('net');
const { argv } = require('process');

// const path = homeDir + '/Project/qvp/fw/Tools/QVP/coverage/report';
// const files = fs.readdirSync(path);
// const cores_path_array = [];

// for (let i = 0; i < files.length; i++) {
//   const cores_path = `${path}/${files[i]}/index.html`;
//   cores_path_array.push(cores_path);
//   ipcMain.on(files[i], (event) => {
//     const child_core = new BrowserWindow({ child: true, modal: true, show: false, width: 1200, height: 600 });
//     child_core.loadFile(cores_path);
//     child_core.once('ready-to-show', () => {
//       child_core.show()
//     })
//   })
// }

ipcMain.on('start-coverage', (event, args) => {
  console.log("start code coverage :", args[0], args[1]);
  const cmd = args[0]

  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      event.sender.send('coverage-start-failed', `${error.message}`)
      return;
    }

    if (stderr) {
      console.log(`stderr: ${stderr}`)
      event.sender.send('coverage-start-failed', `${stderr}`)
      return;
    }

    event.sender.send('coverage-started', `${stdout}`)
  });

});


ipcMain.on('stop-coverage', (event, args) => {

  const cmd = args[0]
  console.log("stop code coverage :", cmd);

  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      event.sender.send('coverage-stop-failed', `${error.message}`)
      return;
    }

    if (stderr) {
      console.log(`stderr: ${stderr}`)
      event.sender.send('coverage-stop-failed', `${stderr}`)
      return;
    }

    event.sender.send('coverage-stopped', `${stdout}`)
  });

});


ipcMain.on('get-coverage-report', (event, args) => {

  const cmd = args[0]
  console.log("view code coverage :", cmd);

  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      event.sender.send('coverage-stop-failed', `${error.message}`)
      return;
    }

    if (stderr) {
      console.log(`stderr: ${stderr}`)
      event.sender.send('coverage-stop-failed', `${stderr}`)
      return;
    }
    event.sender.send('coverage-report', `${stdout}`)
  });

});

