const { ipcRenderer } = require('electron')
const { chart } = require('chartjs')
const fs = require('fs');
const path = require('path');
const { event } = require('jquery');
const app = require('electron').remote.app

let qvpConfigData = [];
let coreInfo = [];

function updateProgressBar(coreInfo) {
    coreInfo.forEach(item => {
        const lcid = item.name + "-lc-coverage-progress-bar";
        const fcid = item.name + "-fc-coverage-progress-bar";

        $(`#${lcid}`).progress({ percent: 60 });
        $(`#${fcid}`).progress({ percent: 100 });
    });
}

function createProgressColumn(labelText, id, coveragePercent, success = false) {
    const column = document.createElement("div");
    column.className = "column";

    const progress = document.createElement("div");
    progress.className = success ? "ui tiny indicating progress" : "ui tiny indicating progress";
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

function CreateProgress(data) {
    const container = document.createElement("div");
    container.className = "ui grid";

    const row = document.createElement("div");
    row.className = "two column row";

    const lc = createProgressColumn("LC", data.name + "-lc-coverage-progress-bar", 100);
    const fc = createProgressColumn("FC", data.name + "-fc-coverage-progress-bar", 60, true);

    row.appendChild(lc);
    row.appendChild(fc);

    container.appendChild(row);
    return container;
}

function DisplayCoreData(data) {
    const menu = document.getElementById('coverage-menu');

    const button = document.createElement('button');
    button.className = "ui grey basic button active";
    button.setAttribute("data-core", data.name);
    button.setAttribute("title", "Line & function coverage, click for detailed report");
    button.textContent = data.name

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
    button.appendChild(CreateProgress(data))

    menu.appendChild(button);
}

function getcoveragepercentage(filepath) {
    const rowData = {};

    fs.readFile(filepath, 'utf8', (err, htmlContent) => {
        if (err) {
            console.error('Error reading HTML file:', err);
            return;
        }

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

        rowData['filepath'] = filepath;
        for (let i = 1; i < matchingRows.length; i++) {
            const row = matchingRows[i];
            const headerItems = Array.from(row.querySelectorAll('.headerItem'));
            const headerCovTableEntryLoItems = Array.from(row.querySelectorAll('.headerCovTableEntryLo'));

            headerItems.forEach(item => {
                const key = item.textContent.trim();
                if (key && (key.endsWith('Lines:') || key.endsWith('Functions:'))) {
                    rowData[key] = headerCovTableEntryLoItems.shift().textContent.trim();
                }
            });
        }
    });

    return rowData;
}


function viewReportAll(items) {
    coreInfo = [];
    const coverage = qvpConfigData.QVP.plugin.coverage;
    const menu = document.getElementById('coverage-menu');
    menu.innerHTML = "";

    const directoryPath = app.getAppPath() + "/" + coverage.output;
    fs.readdir(directoryPath, { withFileTypes: true }, (err, entries) => {
        if (err) {
            console.error('Error reading directory:', err);
            return;
        }
        const cores = entries.filter(entry => entry.isDirectory());
        cores.forEach(core => {
            const html = path.join(directoryPath, core.name) + "/index.html"
            const data = getcoveragepercentage(html);
            data['name'] = core.name;
            DisplayCoreData(data);
            coreInfo.push(data);
        });
    });

}

ipcRenderer.on('update-progress', (event, arg) => {
    updateProgressBar(coreInfo);
})


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

    // Add click event handlers for the buttons
    $(document).ready(function () {
        // Handler for all buttons with the 'ui basic button' class
        $(".coverage button").click(function () {
            // Remove active class from all buttons
            $(".coverage button").removeClass("active");
            $(".coverage button").removeClass("blue");

            // Make the clicked button active
            $(this).addClass("active");
            $(this).addClass("blue");

            // Get the associated core data from the data attribute
            const coreData = $(this).data("core");
            // Write data to 'coverage-result-view'
            // $("#coverage-result-view").text(`Core-${coreData} data goes here.`);
            $("#coverage-result-view").load("/home/vishw/workspace/electron-api-demos/QVP/plugins/coverage/results/core0/cov.html");
        });
    });

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

ipcRenderer.on('coverage-report', (event, data) => {
    if (data != 0) {
        displayErrorMsg(data);
    }
    // view reports
    viewReportAll(data);
    ipcRenderer.send('updated-cores-ui')
})

ipcRenderer.on('update-progress-bar', (event) => {
    updateProgressBar(coreInfo);
})

ipcRenderer.on('coverage-script-output', (event, data) => {
    const errorMsg = document.getElementById('coverage-error-msg');
    errorMsg.innerText += "\n" + data;
})

