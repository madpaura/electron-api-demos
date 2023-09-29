const { ipcRenderer } = require('electron')
const app = require('electron').remote.app
const path = require('path')
const fs = require('fs')

var qvpConfig = [];

function GetCmdPath(launch) { 
    return app.getAppPath() + "/" + launch.run.path + "/" + launch.run.script;
}

document.addEventListener("DOMContentLoaded", function () {
    const mainView = document.getElementById('main-view');
    const consoleWindow = document.getElementById('console-window');
    const resizableBar = document.getElementById('resizable-bar');
    const body = document.body;

    let isResizing = false;
    let startY, startHeight;

    resizableBar.addEventListener('mousedown', (e) => {
        isResizing = true;
        startY = e.clientY;
        startHeight = parseFloat(getComputedStyle(mainView).height);
    });

    body.addEventListener('mousemove', (e) => {
        if (!isResizing) return;

        const diffY = e.clientY - startY;
        const newHeight = ((startHeight + diffY) / body.clientHeight) * 100;
        const minHeight = 25;
        const maxHeight = 75;

        if (newHeight >= minHeight && newHeight <= maxHeight) {
            mainView.style.height = newHeight + '%';
            consoleWindow.style.height = 100 - newHeight + '%';
            console.log(newHeight + '%', 100 - newHeight + '%')
        }

        const outputSegment = document.querySelector('.output.ui.bottom.attached.basic.segment');
        outputSegment.style.maxHeight = parseFloat(getComputedStyle(consoleWindow).height) + 'px';
    });

    body.addEventListener('mouseup', () => {
        isResizing = false;
    });


    const filePath = app.getAppPath() + '/qvp-config.json';
    const data = fs.readFileSync(filePath, 'utf8');

    try {
        qvpConfig = JSON.parse(data);
    } catch (error) {
        console.error('Error parsing JSON:', error);
    }

    const launch = qvpConfig.QVP.launch
    const start = document.getElementById('start-qvp-button');
    start.addEventListener('click', () => {
        // document.getElementById('launch-script-output').innerText = ""
        EnableStart(false);
        EnableStop(true);
        ipcRenderer.send('run-qvp', [GetCmdPath(launch), launch.run.start_cmd])
    })

    const stop = document.getElementById('stop-qvp-button');
    EnableStop(false);
    stop.addEventListener('click', () => {
        EnableStop(false);
        EnableStart(false);
        ipcRenderer.send('stop-qvp', [GetCmdPath(launch), launch.run.stop_cmd])
    })

    const ssh = document.getElementById('ssh-qvp-button');
    ssh.addEventListener('click', () => {
        console.log("ssh connection");
        // ipcRenderer.send('ssh-qvp', [GetCmdPath(launch), launch.run.start_cmd])
    })
});

function EnableStart(state) {
    const start = document.getElementById('start-qvp-button');
    start.disabled = !state;
}

function EnableStop(state) {
    const stop = document.getElementById('stop-qvp-button');
    stop.disabled = !state;
}

ipcRenderer.on('qvp-launch-output', (event, data) => {
    const outputElement = document.getElementById('launch-script-output');
    outputElement.innerHTML += `${data}`;
    console.log(outputElement.scrollTop, outputElement.scrollHeight)
    outputElement.scrollTop = outputElement.scrollHeight;
    console.log(outputElement.scrollTop, outputElement.scrollHeight)
});

function ErrorMsg(data) {
    const outputElement = document.getElementById('launch-script-output');
    outputElement.innerHTML += `<div class="ui error small message"> \
    <i class="close icon"></i> \
    <div class="header">Failed launching QVP..</div> \
    <p>${data}</p>
    </div>`
}

ipcRenderer.on('qvp-start-error', (event, data) => {
    EnableStart(true);
    EnableStop(true);
    ErrorMsg(data);
});

ipcRenderer.on('qvp-start-success', (event, data) => {
    EnableStart(true);
    EnableStop(true);
    if ( data != 0 ){
        ErrorMsg(`Script failed, status code : ${data}` )
    }
});

ipcRenderer.on('qvp-stop-error', (event, data) => {
    EnableStop(true);
    EnableStart(true);
    if ( data != 0 ){
        ErrorMsg(`Script failed, status code : ${data}` )
    }
});

ipcRenderer.on('qvp-stop-success', (event, data) => {
    console.log(data);
    EnableStop(true)
    EnableStart(true)
});

  