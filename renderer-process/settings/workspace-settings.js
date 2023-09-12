const { desktopCapturer, screen, shell } = require('electron')
const { ipcRenderer } = require('electron')

const fs = require('fs')
const json = require('highlight.js/lib/languages/json')
const os = require('os')
const path = require('path')
const app = require('electron').remote.app

let jsonData = [];

// Helper function to render the current settings tab
function renderTab(tab) {
  const app = document.getElementById('tabcontent');
  app.innerHTML = '';

  const container = document.createElement('div');
  container.className = 'settings-container';
  const title = document.createElement('h2');
  title.textContent = tab;
  container.appendChild(title);

  jsonData[tab].forEach((item) => {
    const element = createUIElement(item);
    container.appendChild(element);
  });

  app.appendChild(container)
}

function createUIElement(item) {
  const wrapper = document.createElement('div');
  wrapper.className = 'row mb-1';

  const element = document.createElement('div');
  element.className = 'setting-row';

  const label = document.createElement('label');
  label.textContent = item.label;

  let inputElement;

  const inputWrapper = document.createElement('div');
  inputWrapper.className = 'input-group';
  inputWrapper.appendChild(label);

  switch (item.type) {
    case 'input':
      inputElement = document.createElement('input');
      inputElement.type = 'text';
      inputElement.id = item.id;
      inputElement.className = 'form-control';
      inputElement.value = item.value
      inputElement.addEventListener('input', handleChangeEvent)
      inputWrapper.appendChild(inputElement);
      break;

    case 'checkbox':
      inputElement = document.createElement('input');
      inputElement.type = 'checkbox';
      inputElement.id = item.id;
      inputElement.className = 'form-check-input';
      inputElement.checked = item.value
      inputElement.addEventListener('change', handleChangeEvent)
      inputWrapper.appendChild(inputElement);
      break;

    case 'list':
      inputElement = document.createElement('select');
      inputElement.id = item.id;
      inputElement.className = 'form-select';
      item.options.forEach((option) => {
        const optionElement = document.createElement('option');
        optionElement.textContent = option;
        inputElement.appendChild(optionElement);
      });
      inputElement.value = item.value
      inputElement.addEventListener('change', handleChangeEvent)
      inputWrapper.appendChild(inputElement);
      break;

    case 'boolean':
      inputElement = document.createElement('input');
      inputElement.type = 'checkbox';
      inputElement.id = item.id;
      inputElement.className = 'form-check-input';
      inputElement.checked = item.value
      inputElement.addEventListener('change', handleChangeEvent)
      inputWrapper.appendChild(inputElement);
      break;

    case 'file':
      inputElement = document.createElement('input');
      inputElement.type = 'file';
      inputElement.id = item.id;
      inputElement.className = 'form-control-file';
      inputElement.style.display = 'none'; // Hide the file input

      // Create a div element to display the selected file name
      const fileDiv = document.createElement('div');
      fileDiv.textContent = item.value;
      fileDiv.className = 'file-label';
      fileDiv.addEventListener('click', () => {
        inputElement.click();
      });

      // Listen for file selection and update the label
      inputElement.addEventListener('change', () => {
        if (inputElement.files.length > 0) {
          fileDiv.textContent = inputElement.files[0].name;
          updateJSONData(inputElement.id, inputElement.files[0].name);
        }
      });

      // Append both the file input and label to the container
      inputWrapper.appendChild(inputElement);
      inputWrapper.appendChild(fileDiv);
      break;

    default:
      break;
  }

  element.appendChild(inputWrapper);
  wrapper.appendChild(element);

  return wrapper;
}

function updateJSONData(id, value) {
  const tabs = Object.keys(jsonData);
  tabs.forEach(key => {
    jsonData[key].forEach((item) => {
      if (item.id === id) {
        item.value = value;
        return
      }
    });
  })
}

function handleChangeEvent(event) {
  const target = event.target;
  const value = target.type === 'checkbox' ? target.checked : target.value;
  updateJSONData(target.id, value);
}

// Handle navigation events from the main process
ipcRenderer.on('navigate-tab', (event, tab) => {
  renderTab(tab);
});

fetch(app.getAppPath() + '/qvp-config.json')
  .then((response) => response.json())
  .then((json) => {

    jsonData = json.QVP.workspace;
    const settings = document.getElementById('settings-section');
    const tabContainer = document.createElement('div');
    tabContainer.className = 'tab-container';

    // Using Object.keys()
    const tabs = Object.keys(jsonData);
    tabs.forEach(key => {
      const tabButton = document.createElement('button');
      tabButton.textContent = key;
      tabButton.addEventListener('click', () => {
        ipcRenderer.send('navigate-tab', key);
      });
      tabContainer.appendChild(tabButton);
    });
    const tabView = document.createElement('div');
    tabView.className = 'tab-view'
    tabView.id = 'tabcontent'
    settings.appendChild(tabContainer);
    settings.appendChild(tabView)

    renderTab(tabs[0]);
  })
