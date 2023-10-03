const { ipcMain } = require('electron')
const { exec } = require('child_process');
const { Script } = require('vm');
const fs = require('fs');
const { spawn } = require('child_process');

let proc;

let bashScriptOutput = ""

class CircularBuffer {
  constructor(size) {
    this.size = size;
    this.buffer = new Array(size);
    this.head = 0; // Points to the most recent log entry
    this.tail = -1; // Points to the oldest log entry (initialized as -1 for an empty buffer)
    this.length = 0; // Current number of log entries in the buffer
  }

  // Add a new log entry to the circular buffer
  push(entry) {
    // Move the tail if the buffer is full
    if (this.length === this.size) {
      this.tail = (this.tail + 1) % this.size;
    } else {
      this.length++;
    }

    // Add the log entry to the head position
    this.buffer[this.head] = entry;
    this.head = (this.head + 1) % this.size;
  }

  // Get all log entries in the circular buffer
  getAll() {
    const logs = [];
    let currentIndex = this.tail;
    for (let i = 0; i < this.length; i++) {
      logs.push(this.buffer[currentIndex]);
      currentIndex = (currentIndex + 1) % this.size;
    }
    return logs;
  }
}

ipcMain.on('stop-qvp', (event, arg) => {
  console.log("stop-qvp-cmd", arg)

  killAllQVPProcesses();

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

// script run, in UI mode we don;t actually execute the script, instead just evalaute commands
ipcMain.on('run-qvp', (event, arg) => {
  console.log("run-qvp", arg)
  bashScriptOutput = ""

  if (proc) {
    proc.kill('SIGTERM');
  }

  proc = exec(arg.join(' '));
  proc.stdout.on('data', (data) => {
    bashScriptOutput += data;
    event.sender.send('qvp-launch-output', data);
  });

  proc.stderr.on('data', (data) => {
    event.sender.send('qvp-start-error', data);
  });

  proc.on('close', (code) => {
    const lines = bashScriptOutput.split('\n');
    const host = lines.filter((line) => line.includes('qemu-system-x86_64'));
    const cores = lines.filter((line) => line.includes('qemu-system-aarch64'));
    const nvme = lines.filter((line) => line.includes('nvme_controller'));

    const cmds = {}
    cmds['host'] = host
    cmds['cores'] = cores
    cmds['nvme'] = nvme

    event.sender.send('qvp-start-process', code, cmds);

    executeQVPCommand(event, 'console-log-nvme', nvme[0]);
    executeQVPCommand(event, 'console-log-host', host[0])
    cores.forEach((core, index) => {
      executeQVPCommand(event, `console-log-core-${index}`, core)
    })
  });
});

let qemuProcesses = [];

function executeQVPCommand(event, id, cmd) {
  console.log(`Executing QEMU command: ${cmd}, ${id}`);

  // Split the full command into an array of executable and arguments
  const commandParts = cmd.split(' ');

  // Spawn a QEMU process
  const qemuProcess = spawn(commandParts[0], commandParts.slice(1), { stdio: 'pipe' });
  const logBuffer = new CircularBuffer(2000);

  // Store information about the process
  const processInfo = {
    id,
    cmd,
    pid: qemuProcess.pid,
    status: null,
    process: qemuProcess,
    log: logBuffer
  };

  console.log(`Executing QEMU command: ${qemuProcess.pid}`);

  qemuProcesses.push(processInfo);

  qemuProcess.on('close', (code) => {
    processInfo.status = code;
    console.log(`QEMU command '${cmd}' (PID ${qemuProcess.pid}) exited with code ${code}`);
    event.sender.send('qvp-core-close', id, qemuProcess.pid, code );
  });

  qemuProcess.on('error', (err) => {
    console.error(`Error executing QEMU command: ${err.message}`);
    event.sender.send('qvp-core-error', id, qemuProcess.pid, err.message);
  });

  qemuProcess.stdout.on('data', (data) => {
    event.sender.send('qvp-core-data', id, qemuProcess.pid, data.toString());
  });

}

function killAllQVPProcesses() {
  for (const processInfo of qemuProcesses) {
    const { pid, process } = processInfo;
    console.log(`Killing QEMU process (PID ${pid})`);
    process.kill('SIGTERM');
  }
}

ipcMain.on('console-log-navigate-tab', (event, arg) => {
  event.sender.send('console-log-navigate-tab-data', arg); 
});

