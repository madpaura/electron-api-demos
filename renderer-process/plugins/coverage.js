const { ipcRenderer } = require('electron')
const fs = require('fs');
const app = require('electron').remote.app

let qvpConfigData = [];
let coreData = [];

function updateProgressBar(coreInfo) {
    for (let index = 0; index < coreData.length; index++) {
        const lcid = coreData[index].name + "-lc-coverage-progress-bar";
        const fcid = coreData[index].name + "-fc-coverage-progress-bar";

        $(`#${lcid}`).progress({ percent: coreData[index].line });
        $(`#${fcid}`).progress({ percent: coreData[index].function });
    }
}

function createProgressColumn(labelText, id) {
    const column = document.createElement("div");
    column.className = "column";

    const progress = document.createElement("div");
    progress.className = "ui tiny indicating progress";
    progress.id = id;

    const bar = document.createElement("div");
    bar.className = "bar";

    const label = document.createElement("div");
    label.className = "label";
    label.textContent = labelText;

    progress.appendChild(bar);
    progress.appendChild(label);

    column.appendChild(progress);

    return column;
}

function CreateProgress(name) {
    const container = document.createElement("div");
    container.className = "ui grid";

    const row = document.createElement("div");
    row.className = "two column row";

    const lc = createProgressColumn("LC", name + "-lc-coverage-progress-bar");
    const fc = createProgressColumn("FC", name + "-fc-coverage-progress-bar");

    row.appendChild(lc);
    row.appendChild(fc);

    container.appendChild(row);
    return container;
}

function DisplayCoreData(coredata) {
    const name = coredata.name;
   
    const menu = document.getElementById('coverage-menu');

    const button = document.createElement('button');
    button.className = "ui basic grey button active";
    button.setAttribute("data-core", name);
    button.setAttribute("title", "Line & function coverage, click for detailed report");
    button.textContent = name
    button.id = name + "-button"

    button.addEventListener('click', () => {
        $(".coverage button").removeClass("active");
        $(".coverage button").removeClass("blue");

        // Make the clicked button active
        button.classList.add("active");
        button.classList.add("blue");

        const coreData = button.getAttribute("data-core");
        $("#coverage-result-view").text(`Core-${coreData} data goes here.`);
    });

    button.innerHTML += '<hr>'
    button.appendChild(CreateProgress(name))

    menu.appendChild(button);
}

function Getcoveragepercentage(coredata) {

    const name = coredata.name;
    const filepath = coredata.filepath;

    const htmlContent = fs.readFileSync(filepath, 'utf8');
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const matchingRows = Array.from(doc.querySelectorAll('tr')).filter(row => {
        const headerItems = row.querySelectorAll('.headerItem');
        for (const headerItem of headerItems) {
            const text = headerItem.textContent.trim();
            if (text === 'Lines:' || text === 'Functions:') {
                return true;
            }
        }
        return false;
    });

    for (let i = 1; i < matchingRows.length; i++) {
        const row = matchingRows[i];
        const headerItems = Array.from(row.querySelectorAll('.headerItem'));
        const headerCovTableEntryLoItems = Array.from(row.querySelectorAll('.headerCovTableEntryLo'));

        headerItems.forEach(item => {
            const key = item.textContent.trim();
            let cleanedKey = key.replace(/:/g, "");

            if (key && (key.endsWith('Lines:'))) {
                let value = headerCovTableEntryLoItems.shift().textContent.trim().replace(/%/g, "").trim();
                coredata['line'] = value;
            }
            if (key && (key.endsWith('Functions:'))) {
                let value = headerCovTableEntryLoItems.shift().textContent.trim().replace(/%/g, "").trim();
                coredata['function'] = value;
            }
        });
    }
}

function BuildCoresReportUI(items) {
    const coverage = qvpConfigData.QVP.plugin.coverage;
    const menu = document.getElementById('coverage-menu');
    menu.innerHTML = "";

    for (let index = 0; index < items.length; index++) {
        Getcoveragepercentage(items[index]);
        DisplayCoreData(items[index]);
    }
    coreData = items;
    ipcRenderer.send('updated-cores-ui', items);
}

document.addEventListener("DOMContentLoaded", function () {

    const filePath = app.getAppPath() + '/qvp-config.json';
    const data = fs.readFileSync(filePath, 'utf8');
    let coverage;

    try {
        qvpConfigData = JSON.parse(data);
        coverage = qvpConfigData.QVP.plugin.coverage;
        ipcRenderer.send('start-coverage', [app.getAppPath() + "/" + coverage.start_cmd, coverage.output])
    } catch (error) {
        console.error('Error parsing JSON:', error);
    }

    const start = document.getElementById('start-cov-button');
    start.addEventListener('click', () => {
        ipcRenderer.send('start-coverage', [app.getAppPath() + "/" + coverage.start_cmd, coverage.output])
    })

    const stop = document.getElementById('stop-cov-button');
    stop.addEventListener('click', () => {
        ipcRenderer.send('stop-coverage', [app.getAppPath() + "/" + coverage.stop_cmd, coverage.output])
    })

    const view = document.getElementById('view-cov-button');
    view.addEventListener('click', () => {
        ipcRenderer.send('get-coverage-report', [app.getAppPath() + "/" + coverage.view_cmd, coverage.output])
    })

});

function displayErrorMsg(data) {
    const errorMsg = document.getElementById('coverage-error-msg');
    errorMsg.innerText += "\n" + data;

    const error = document.getElementById('coverage-error-banner');
    error.classList.remove('hidden')
}

ipcRenderer.on('coverage-failed', (event, data) => {
    displayErrorMsg(data);
})

ipcRenderer.on('coverage-started', (event, data) => {
    if (data != 0) {
        displayErrorMsg(data);
    }
})

ipcRenderer.on('coverage-stopped', (event, data) => {
    if (data != 0) {
        displayErrorMsg(data);
    }
})

ipcRenderer.on('coverage-report', (event, status, data) => {
    if (status != 0) {
        displayErrorMsg(data);
        return;
    }

    BuildCoresReportUI(data);
})

ipcRenderer.on('update-progress-bar', (event) => {

    console.log("updating progress bar", coreData[0].name + "-button");
    const button = document.getElementById(coreData[0].name + "-button");
    button.click();

    updateProgressBar();
})

ipcRenderer.on('coverage-script-output', (event, data) => {
    const errorMsg = document.getElementById('coverage-error-msg');
    errorMsg.innerText += "\n" + data;
})

