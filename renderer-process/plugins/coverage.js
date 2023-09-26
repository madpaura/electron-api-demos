const { ipcRenderer } = require('electron')
const { chart } = require('chartjs')
const fs = require('fs');
const { event } = require('jquery');
const app = require('electron').remote.app

let qvpConfigData = [];

function createFolderButtons(path) {
    const files = fs.readdirSync(path);

    for (let i = 0; i < files.length; i++) {
        const div = document.createElement('div');
        div.classList.add("col-6", "d-inline-block");
        if (i % 2 == 0) {
            div.classList.add("text-center")
        }
        else {
            div.classList.add("text-start")
        }
        const button = document.createElement("button");
        button.setAttribute("id", files[i]);
        button.classList.add("demo-button", "coverage-button");
        button.textContent = files[i].toUpperCase();
        button.addEventListener('click', () => {
            ipcRenderer.send(files[i]);
        })

        div.appendChild(button);
        document.querySelector('.coverage').appendChild(div);
    }
}

// const generateReportBtn = document.getElementById('generate-report-btn')
// generateReportBtn.addEventListener('click', () => {
//     ipcRenderer.send('tools-message')
// });

function getColor(percentage) {
    if (percentage <= 50) {
        return 'rgb(255, 0, 0)'; // red
    }
    else if (percentage > 50 && percentage < 75) {
        return 'rgb(80, 200, 120)' // light green
    } else {
        return 'rgb(255, 165, 0)'; // orange
    }
}

ipcRenderer.on('coverage-generated-reply', (event, arg) => {

    const allbtns = document.querySelectorAll('.coverage-button');
    var index = 0;
    const message = `${arg}`
    const percentageRegex = /<td\s+class=['"]headerCovTableEntryLo['"]>([\d.]+) %<\/td>/g;
    const percentages = [];

    let match;
    while ((match = percentageRegex.exec(message)) !== null) {
        const percentage = parseFloat(match[1]);
        percentages.push(percentage)
    }

    for (let j = 0; j < percentages.length && index < allbtns.length; j++) {
        const percentage1 = percentages[j];
        const percentage2 = 0;

        const chartContainer = document.createElement('div');
        chartContainer.classList.add('chart-container');
        allbtns[index].appendChild(chartContainer);

        const canvas1 = document.createElement('canvas');
        canvas1.classList.add('chart-canvas');
        chartContainer.appendChild(canvas1);

        const canvas2 = document.createElement('canvas');
        canvas2.classList.add('chart-canvas');
        chartContainer.appendChild(canvas2);

        var options = {
            responsive: true,
            maintainAspectRatio: false,
            tooltips: {
                enabled: false
            },
            animation: {
                onComplete: function () {
                    var chartInstance = this.chart;
                    var ctx = chartInstance.ctx;
                    ctx.font = Chart.helpers.fontString(12, 'bold', Chart.defaults.global.defaultFontFamily);

                    chartInstance.data.datasets.forEach(function (dataset) {
                        var meta = chartInstance.getDatasetMeta(0);
                        var value = dataset.data[0];
                        var total = dataset.data.reduce(function (a, b) {
                            return a + b;
                        }, 0);
                        var percentage = ((value / total) * 100).toFixed(1) + '%';
                        ctx.fillStyle = 'black';
                        var position = meta.data[0].tooltipPosition();
                        ctx.fillText(percentage, position.x + 10, position.y - 15);
                    })
                }
            },
            legend: {
                display: true,
                position: 'bottom',
                labels: {
                    generateLabels: function (chart) {
                        var data = chart.data;
                        if (data.labels.length && data.datasets.length) {
                            return data.labels.map(function (label, i) {
                                return {
                                    text: label,
                                    fillStyle: 'rgba(0,0,0,0)',
                                    strokeStyle: 'rgba(0,0,0,0)',
                                    hidden: false,
                                    index: i
                                }
                            })
                        }
                    }
                }
            }
        }

        const ctx1 = canvas1.getContext('2d');
        const data1 = {
            labels: ['Line     '],
            datasets: [{
                data: [percentage1, 100 - percentage1],
                backgroundColor: [getColor(percentage1), '#7CB9E8']
            }]
        };

        const chart1 = new Chart(ctx1, {
            type: 'pie',
            data: data1,
            options: options
        });

        const ctx2 = canvas2.getContext('2d');
        const data2 = {
            labels: ['Function'],
            datasets: [{
                data: [percentage2, 100 - percentage2],
                backgroundColor: [getColor(percentage2), '#7CB9E8']
            }]
        };

        const chart2 = new Chart(ctx2, {
            type: 'pie',
            data: data2,
            options: options
        });

        index++;
    }
})

document.addEventListener("DOMContentLoaded", function () {

    const filePath = app.getAppPath() + '/qvp-config.json';
    const data = fs.readFileSync(filePath, 'utf8');
    let coverage;

    try {
        qvpConfigData = JSON.parse(data);
        coverage = qvpConfigData.QVP.plugin.coverage;
        ipcRenderer.send('start-coverage', [app.getAppPath() + "/"+ coverage.start, coverage.output])
    } catch (error) {
        console.error('Error parsing JSON:', error);
    }

    const start = document.getElementById('start-cov-button');
    start.addEventListener('click', () => {
        ipcRenderer.send('start-coverage', [app.getAppPath() + "/"+ coverage.start, coverage.output])
    })

    const stop = document.getElementById('stop-cov-button');
    stop.addEventListener('click', () => {
        ipcRenderer.send('stop-coverage', [app.getAppPath() + "/"+ coverage.stop, coverage.output])
    })

    const view = document.getElementById('view-cov-button');
    view.addEventListener('click', () => {
        ipcRenderer.send('get-coverage-report', [app.getAppPath() + "/"+ coverage.view, coverage.output])
    })

});


ipcRenderer.on('coverage-started', (event, data) => {
    console.log(data)
})

ipcRenderer.on('coverage-stopped', (event, data) => {
    console.log(data)
    createFolderButtons('/home/vishw/tmp');
})

ipcRenderer.on('coverage-report', (event, data) => {
    console.log(data)
    // ready to view report
})
