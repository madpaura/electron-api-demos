const { BrowserWindow } = require('electron').remote
const { ipcRenderer } = require('electron')
const settings = require('electron-settings')

const path = require('path')
const http = require('http')
const https = require('https');
const fs = require('fs')
const { event } = require('jquery')
const app = require('electron').remote.app

// Directory to save downloaded files
const downloadDirectory = path.join(__dirname, 'downloads');
var downloadSuccessful = false;
var qvpConfigData = [];

// Create the download directory if it doesn't exist
if (!fs.existsSync(downloadDirectory)) {
  fs.mkdirSync(downloadDirectory);
}

function downloadFile(server) {
  return new Promise((resolve, reject) => {
    const protocol = server.link.startsWith('https') ? https : http;

    protocol.get(server.link, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download from ${server.ip}. Status code: ${response.statusCode}`));
        return;
      }

      const filePath = app.getAppPath() + `/qvp-install-${server.ip}.sh`;
      const writer = fs.createWriteStream(filePath, { flags: 'w' });
      fs.chmodSync(filePath, 0o755);

      response.pipe(writer);
      console.log(response.headers)
      writer.on('finish', () => {
        writer.close();

        settings.set('accessibleSever', server)
        settings.set('downloadedfilePath', filePath)
        resolve({ filePath, status: 'fulfilled' });
        if (!downloadSuccessful) {
          downloadSuccessful = true;
          ipcRenderer.send('download-complete', filePath);
        }
      });

      writer.on('error', (error) => {
        reject(error);
      });
    }).on('error', (error) => {
      reject(new Error(`Failed to download from ${server.ip}: ${error.message}`));
    });
  });
}

// Function to get selected checkbox values
function getSelectedValues() {
  const installDiv = document.getElementById('install-list');
  const checkboxes = installDiv.querySelectorAll('input[type="checkbox"]:checked');
  const selectedValues = Array.from(checkboxes).map(checkbox => checkbox.value);
  return selectedValues;
}


function createCheckbox(item) {
  const checkbox = document.createElement('div');
  checkbox.classList.add('ui', 'checkbox');

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.id = item.id;
  input.value = item.value;

  const label = document.createElement('label');
  label.htmlFor = item.id;
  label.textContent = item.name;

  checkbox.appendChild(input);
  checkbox.appendChild(label);

  return checkbox;
}

function populateOptions(data) {
  const left = document.getElementById('install-items-left');
  const right = document.getElementById('install-items-right');
  var cnt = 0
  data.forEach(tool => {

    const segment = document.createElement('div');
    segment.classList.add('ui', 'segment');

    const desc = document.createElement('p');
    desc.textContent = tool.des;

    if ( tool.modules ) {
      const span = document.createElement('span')
      tool.modules.forEach(module => {
        const checkbox = createCheckbox(module);
        span.appendChild(checkbox)
      });
      segment.appendChild(span)
      segment.appendChild(desc)
    }
    else {
      const checkbox = createCheckbox(tool)
      segment.appendChild(checkbox)
      segment.appendChild(desc)
    }

    // TODO this must be fixed
    cnt++
    if (cnt < 5)
      left.append(segment)
    else
      right.append(segment)
  });
}

async function readConfig() {
  const filePath = app.getAppPath() + '/qvp-config.json';
  const data = fs.readFileSync(filePath, 'utf8');

  try {
    qvpConfigData = JSON.parse(data);
    const servers = qvpConfigData.QVP.install.servers;

    const downloadPromises = servers.map(downloadFile);
    // Use Promise.all to wait for all download promises, regardless of fulfillment or rejection
    Promise.all(downloadPromises.map(promise => promise.catch(error => ({ status: 'rejected', reason: error }))))
      .then(results => {

        const successfulDownloads = results
          .filter(result => result.status === 'fulfilled')
          .map(result => result.value);

        const failedDownloads = results
          .filter(result => result.status === 'rejected')
          .map(result => result.reason.message);

        if (successfulDownloads.length === 0) {
          console.error('None of the servers were reachable.');
          const error = document.getElementById('install-error-banner');
          error.classList.remove('hidden')
        }

        if (failedDownloads.length > 0) {
          const errorMsg = document.getElementById('install-error-msg');
          failedDownloads.forEach(errorMessage => {
            console.error(errorMessage);
            errorMsg.innerText += "\n" + errorMessage
          });
        }
      });
  } catch (error) {
    console.error('Error parsing JSON:', error);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  readConfig();
});

ipcRenderer.on('setup-install-options', (event, data) => {

    // populate ui
    populateOptions(qvpConfigData.QVP.install.tools)

    const installButton = document.getElementById('install');

    // Event listener for the "Run Bash Script" button
    installButton.addEventListener('click', () => {
      installButton.disabled = true;
      installButton.classList.add('disabled-button')
      installButton.classList.add('loading')
      const outputElement = document.getElementById('script-output-text');
      outputElement.innerHTML = "";
      const selectedValues = getSelectedValues();
      $('#install-progress').progress({
        percent: 0
      });
      const script = settings.get('downloadedfilePath')
      ipcRenderer.send('execute-script', [script, ...selectedValues]);
    });

});

ipcRenderer.on('install-output', (event, data) => {
  const outputElement = document.getElementById('script-output-text');
  outputElement.innerHTML += `${data}`;
  outputElement.scrollTop = outputElement.scrollHeight;

  $('#install-progress').progress({
    percent: Math.floor(Math.random() * 100) + 1
  });

});

ipcRenderer.on('install-complete', (event, data) => {
  document.getElementById('install').disabled = false;
  document.getElementById('install').classList.remove('disabled-button')
  document.getElementById('install').classList.remove('loading')
  $('#install-progress').progress({
    percent: 100
  });
});
