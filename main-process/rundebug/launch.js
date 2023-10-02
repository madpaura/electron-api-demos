const { ipcMain } = require('electron')
const { exec } = require('child_process');
const { Script } = require('vm');
const fs = require('fs');
const { spawn } = require('child_process');

let proc;

let bashScriptOutput = ""

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

    executeQVPCommand(event, 'nvme', nvme[0]);
    // executeQVPCommand(event, 'host', host)
    // cores.forEach((core, index) => {
    //   executeQVPCommand(event, `core-${index}`, core)
    // })
  });
});

let qemuProcesses = [];

function executeQVPCommand(event, id, cmd) {
  console.log(`Executing QEMU command: ${cmd}`);

  // Split the full command into an array of executable and arguments
  const commandParts = cmd.split(' ');

  // Spawn a QEMU process
  const qemuProcess = spawn(commandParts[0], commandParts.slice(1), { stdio: 'pipe' });

  // Store information about the process
  const processInfo = {
    id,
    cmd,
    pid: qemuProcess.pid,
    status: null,
    process: qemuProcess,
  };

  console.log(`Executing QEMU command: ${qemuProcess.pid}`);

  qemuProcesses.push(processInfo);

  qemuProcess.on('close', (code) => {
    processInfo.status = code;
    console.log(`QEMU command '${cmd}' (PID ${qemuProcess.pid}) exited with code ${code}`);
    event.sender.send('qvp-core-close', qemuProcess.pid, code );
  });

  qemuProcess.on('error', (err) => {
    console.error(`Error executing QEMU command: ${err.message}`);
    event.sender.send('qvp-core-error', qemuProcess.pid, err.message);
  });

  qemuProcess.stdout.on('data', (data) => {
    // console.log(`[PID ${qemuProcess.pid}] stdout: ${data.toString()}`);
    event.sender.send('qvp-core-data', qemuProcess.pid, data.toString());
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
 
});

