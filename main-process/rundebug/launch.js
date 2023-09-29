const { ipcMain } = require('electron')
const { exec } = require('child_process');
const { Script } = require('vm');
const fs = require('fs');

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


ipcMain.on('console-log-navigate-tab', (event, arg) => {

  const filePath = '/home/vishw/workspace/electron-api-demos/QVP/launch/nvme.log';

  let filePosition = 0;

  // Function to read and send only appended lines
  function readAndSendAppendedLines(event, id) {
    const fileStats = fs.statSync(filePath);
    const fileSize = fileStats.size;

    if (filePosition < fileSize) {
      const readStream = fs.createReadStream(filePath, {
        start: filePosition,
        end: fileSize,
        encoding: 'utf-8',
      });

      let appendedLines = '';

      readStream.on('data', (chunk) => {
        appendedLines += chunk;
      });

      readStream.on('end', () => {
        const newLines = appendedLines.split('\n');
        filePosition = fileSize;
        event.sender.send('console-log-data', arg, newLines);
      });
    }
  };

  fs.watch(filePath, (eventType, filename) => {
    if (eventType === 'change') {
      readAndSendAppendedLines(event, arg);
    }
  });

  readAndSendAppendedLines(event, arg);
});

