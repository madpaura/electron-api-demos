const os = require('os');
const fs = require('fs');
const exec = require('child_process').exec;
const prompt = require('electron-prompt');

function createTableSpace(height) {
    const spaceDiv = document.createElement('div');
    spaceDiv.classList.add('table-space');
    spaceDiv.style.height = `${height}px`;
    return spaceDiv;
}

function createTableWithHeader(tableContainer, tableData) {
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');

    // Create the header row
    const headerRow = document.createElement('tr');
    for (const headerCellText of tableData.headers) {
        const headerCell = document.createElement('th');
        headerCell.textContent = headerCellText;
        headerRow.appendChild(headerCell);
    }
    thead.appendChild(headerRow);

    // Create the data rows
    for (const rowData of tableData.rows) {
        const dataRow = document.createElement('tr');
        for (const cellData of rowData) {
            const dataCell = document.createElement('td');
            dataCell.textContent = cellData;
            dataRow.appendChild(dataCell);
        }
        tbody.appendChild(dataRow);
    }

    table.appendChild(thead);
    table.appendChild(tbody);
    tableContainer.appendChild(table);
}


function systemInfo() {
    const tableContainer = document.getElementById('system-info-table')
    const homeDir = os.homedir();
    const cpuModel = os.cpus()[0].model;
    const numProcessors = os.cpus().length;
    const ramGB = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(2);

    dockerVersion = "Docker not found"
    exec('docker --version', (error, stdout, stderr) => {
        if (!error) {
            dockerVersion = stdout.trim();
            console.log(dockerVersion)
        } else {
            console.error('Error getting Docker version:', error);
        }
    })

    kvmVersion = "KVM not enabled"
    exec('kvm --version', (error, stdout, stderr) => {
        if (!error) {
            kvmVersion = stdout.trim();
        } else {
            console.error('Error getting KVM version:', error);
        }
    })

    const contents = {
        headers: ["Components", "Information"],
        rows: [
            ["CPU Model", cpuModel],
            ["Processors", numProcessors],
            ["RAM", ramGB],
            ["Docker", dockerVersion],
            ["KVM", kvmVersion]
        ]
    }
    createTableWithHeader(tableContainer, contents)
}

function dockerInfo() {
    const tableContainer = document.getElementById('docker-info-table')
    const dockerInfo = {
        images: [],
    };

    // Execute Docker images command
    exec('sudo docker images --format "{{.Repository}}:{{.Tag}}"', (error, stdout, stderr) => {
        if (!error) {
            const imagesData = stdout.trim().split('\n').map(image => image.split(':'));

            const tableData = {
                headers: ['Repository', 'Tag'],
                rows: imagesData
            };

            createTableWithHeader(tableContainer, tableData);
        } else {
            console.error('Error getting Docker images:', error);
        }
    });
}

function listFilesInDirectory(directoryPath) {
  return new Promise((resolve, reject) => {
    fs.readdir(directoryPath, (err, files) => {
      if (err) {
        reject(err);
      } else {
        resolve(files);
      }
    });
  });
}

async function osInfo(directoryPath) {
  try {
    const files = await listFilesInDirectory(directoryPath);

    const tableData = {
      headers: ['OS Image'],
      rows: files.map(file => [file]),
    };

    const tableContainer = document.getElementById('os-info-table');
    createTableWithHeader(tableContainer, tableData);
  } catch (error) {
    console.error('Error reading directory:', error);
  }
}

// Example usage
const directoryPath = '/opt/os';
systemInfo()
dockerInfo()
osInfo(directoryPath);

// const sys_export_btn = document.getElementById('sys_export');
// sys_export_btn.addEventListener("click", () => {

// const filePath = `${homeDir}/Desktop/systeminfo.txt`;
// const systemInfoString = `System info\nCPU model ${cpuModel}\nProcessors ${numProcessors}\nRAM ${ramGB}GB\n${dockerVersion}KVM version ${kvmVersion}`;

// fs.writeFileSync(filePath, systemInfoString);
//     prompt({
//         title: 'Specify path to store system info',
//         label: 'default path ~/Desktop/systeminfo.txt',
//         type: 'input',
//         inputAttrs: { type: 'text', required: true, placeholder: 'Enter path' }
//     }).then((r) => {
//         fs.renameSync(filePath, r);
//     }).catch(console.error);
// });
