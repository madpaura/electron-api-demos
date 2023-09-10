const { BrowserWindow } = require('electron').remote
const { ipcRenderer } = require('electron')

const path = require('path')
const http = require('http')
const fs = require('fs')
const json = require('highlight.js/lib/languages/json')
const app = require('electron').remote.app

// Directory to save downloaded files
const downloadDirectory = path.join(__dirname, 'downloads');
var downloadSuccessful = false;

// Create the download directory if it doesn't exist
if (!fs.existsSync(downloadDirectory)) {
  fs.mkdirSync(downloadDirectory);
}

// Function to download a file from a server
function downloadFile(server) {
  const url = new URL(server.link);
  const filename = path.basename(url.pathname);
  const outputFile = path.join(downloadDirectory, filename);

  const protocol = url.protocol === 'https:' ? https : http;

  const request = protocol.get(server.link, (response) => {
    if (response.statusCode === 200) {
      const fileStream = fs.createWriteStream(outputFile);
      fs.chmod(outputFile, 0o755, (err) => {
        if (err) {
          console.error('Error setting execute permission:', err);
        }
      });
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`Downloaded ${filename} from ${server.ip}`);
      });
    } else {
      console.error(`Failed to download ${filename} from ${server.ip}`);
    }
  });

  request.on('error', (error) => {
    console.error(`Error downloading file from ${server.ip}: ${error.message}`);
  });

  request.end();
  return outputFile
}

// Function to get selected checkbox values
function getSelectedValues() {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
  const selectedValues = Array.from(checkboxes).map(checkbox => checkbox.value);
  return selectedValues;
}

function populateOptions(data) {
  const checkboxesContainer = document.getElementById('install-items');

  data.forEach(tool => {
    const div = document.createElement('div');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = tool.id;
    checkbox.value = tool.value;
    const label = document.createElement('label');
    label.htmlFor = tool.id;
    label.textContent = tool.name;
    div.appendChild(checkbox);
    div.appendChild(label);

    // If the tool has modules, create checkboxes for them
    if (tool.modules) {
      tool.modules.forEach(module => {
        const moduleCheckbox = document.createElement('input');
        moduleCheckbox.type = 'checkbox';
        moduleCheckbox.id = module.id;
        moduleCheckbox.value = module.value;
        const moduleLabel = document.createElement('label');
        moduleLabel.htmlFor = module.id;
        moduleLabel.textContent = module.name;
        div.appendChild(moduleCheckbox);
        div.appendChild(moduleLabel);
      });
    }
    checkboxesContainer.append(div)
  });
}

fetch(app.getAppPath() + '/qvp-config.json')
  .then((response) => response.json())
  .then((json) => {
    console.log(json)

    const wikiLink = document.getElementById('install-wiki-link');
    wikiLink.href = json.QVP.common.wiki

    // Iterate through the list of servers and download files
    json.QVP.install.servers.forEach((server) => {
      if (!downloadSuccessful) {
        script = downloadFile(server);
      }
    });

    // populate ui
    populateOptions(json.QVP.install.tools)

    const installButton = document.getElementById('install');
    // Event listener for the "Run Bash Script" button
    installButton.addEventListener('click', () => {
      installButton.disabled = true;
      installButton.classList.add('disabled-button')
      const outputElement = document.getElementById('script-output-text');
      outputElement.innerHTML = "";
      const selectedValues = getSelectedValues();
      ipcRenderer.send('execute-script', [script, ...selectedValues]);
    });
  })

ipcRenderer.on('script-output', (event, data) => {
  const outputElement = document.getElementById('script-output-text');
  outputElement.innerHTML += `${data}`;
  outputElement.scrollTop = outputElement.scrollHeight;
});

ipcRenderer.on('script-exit', (event, data) => {
  document.getElementById('install').disabled = false;
  document.getElementById('install').classList.remove('disabled-button')
});
