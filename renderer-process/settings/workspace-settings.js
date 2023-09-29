const { table } = require('console')
const { desktopCapturer, screen, shell } = require('electron')
const { ipcRenderer } = require('electron')

const fs = require('fs')
const cos = require('highlight.js/lib/languages/cos')
const json = require('highlight.js/lib/languages/json')
const os = require('os')
const path = require('path')
const app = require('electron').remote.app

let configData = [];

// Helper function to render the current settings tab
function renderTab(tab) {
  const app = document.getElementById('tab-contents');
  app.innerHTML = '';

  configData.forEach((item) => {
    const key = Object.keys(item)[0];
    if (key == tab) {
      const groupArray = item[key];
      groupArray.forEach((element) => {
        const div = createUIElement(element);
        app.appendChild(div);
      });
    }
  });

  $('.edit.ui.checkbox').checkbox()
  $('select.dropdown').dropdown();
}

function createUIElement(item) {

  const fields = document.createElement('div')
  fields.classList.add('inline', 'fields')

  const field = document.createElement('div')
  field.classList.add('ten', 'wide', 'field')

  let div, input, label;

  switch (item.type) {
    case 'input':
      label = document.createElement('label');
      label.textContent = item.label;

      div = document.createElement('div')
      div.classList.add('ui', 'fluid', 'icon', 'input')

      input = document.createElement('input');
      input.type = 'text';
      input.id = item.id;
      input.value = item.value
      input.placeholder = "Enter value for " + item.id + "..."

      input.addEventListener('input', handleChangeEvent)
      div.appendChild(input)
      field.appendChild(label)
      field.appendChild(div);
      break;

    case 'checkbox':
    case 'boolean':
      div = document.createElement('div')
      div.classList.add('edit', 'ui', 'toggle', 'checkbox')

      label = document.createElement('label');
      label.textContent = item.label;

      input = document.createElement('input');
      input.type = 'checkbox';
      input.id = item.id;
      input.checked = false
      if (['true', 'on'].includes(item.value)) {
        input.checked = true
      }
      input.addEventListener('change', handleChangeEvent)

      div.appendChild(label)
      div.appendChild(input);
      field.appendChild(div)
      break;

    case 'list':
      div = document.createElement('select');
      div.classList.add('ui', 'fluid', 'search', 'dropdown')

      label = document.createElement('label');
      label.textContent = item.label;

      div.id = item.id;
      item.options.forEach((option) => {
        const opt = document.createElement('option');
        opt.textContent = option;
        opt.value = option;

        div.appendChild(opt);
      });

      div.value = item.value
      div.addEventListener('change', handleChangeEvent)
      field.appendChild(label)
      field.appendChild(div)
      break;

    case 'file':
      label = document.createElement('label');
      label.textContent = item.label;

      div = document.createElement('input');
      div.type = 'text';
      div.placeholder = 'Choose FW binary : ' + item.label;
      div.value = item.value

      input = document.createElement('input');
      input.type = 'file';
      input.accept = '.axf, .elf';
      input.id = item.id;
      input.className = 'form-control-file';
      input.style.display = 'none'; // Hide the file input

      const button = document.createElement('button')
      button.classList.add('ui', 'icon', 'button')
      button.innerHTML = '<i class="folder open icon"></i>'
      button.addEventListener('click', () => {
        input.click();
      });

      // Listen for file selection and update the label
      input.addEventListener('change', () => {
        if (input.files.length > 0) {
          div.value = input.files[0].path;
          updateJSONData(input.id, input.files[0].path);
        }
      });

      field.appendChild(label)
      field.appendChild(div)
      field.appendChild(button)
      break;

    default:
      break;
  }

  fields.appendChild(field);

  return fields;
}


function updateJSONData(id, value) {

  configData.forEach((item) => {
    const key = Object.keys(item)[0];
    const groupArray = item[key];
    groupArray.forEach((element) => {
      if (element.id === id) {
        element.value = value;
        return
      }
    });
  });
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

function parseConfFile(data) {
  // Split the configuration data into line s
  const configLines = data.split('\n');
  const configObjects = [];

  let currentDesc = ''; // Store the most recent comment as 'desc'
  let currentGroupName = null; // Store the current group name
  let currentGroupLines = []; // Store lines within the current group
  let lineno = 0;
  for (const line of configLines) {
    if (line.trim() === '') {
      lineno++
      continue;
    }

    const groupMatch = line.match(/^#+(.*?)#+$/);

    if (groupMatch) {
      // We've entered a new group
      if (currentGroupName) {
        // Create the JSON object for the previous group
        const groupObject = {
          [currentGroupName]: currentGroupLines.map((obj) => {
            // const [key, value] = obj.line.split('=').map((item) => item.trim());
            const [key, value] = obj.line.split('=').map((item) => item.trim().replace(/"/g, ''));
            if (value.match(/\.(axf|elf|bin|qcow2|img|bzImage)$/i)) {
              type = 'file'; // Set 'type' to 'file' for specific file extensions
            } else if (['true', 'false', 'on', 'off'].includes(value)) {
              type = 'checkbox'; // Set 'type' to 'checkbox' for boolean values
            } else {
              type = 'input'
            }
            return {
              type,
              label: key,
              id: key,
              value,
              desc: obj.desc, // Use the most recent comment as 'desc'
              line: obj.lineno
            };
          }),
        };

        configObjects.push(groupObject);

        // Reset currentGroupLines and currentDesc for the next group
        currentGroupLines = [];
        currentDesc = '';
      }

      // Update the current group name
      currentGroupName = groupMatch[1].trim();
    } else if (currentGroupName) {
      if (line.startsWith('#')) {
        // If the line starts with '#', update 'currentDesc'
        currentDesc = line.substring(1).trim();
      } else {
        // Store lines within the current group
        currentGroupLines.push({
          line: line,
          desc: currentDesc,
          lineno: lineno
        })
      }
    }
    lineno++;
  }
  return configObjects;
};

ipcRenderer.on('config-file-changed', (event, path) => {
  fs.readFile(path, 'utf8', (err, data) => {
    if (err) {
      console.error(`Error reading the configuration file: ${err}`);
      return;
    }
    const menu = document.getElementById('tab-menu');
    menu.innerHTML = ''

    configData = parseConfFile(data)
    const firsttab = Object.keys(configData[0])[0];
  
    configData.forEach((groupObject) => {
      const key = Object.keys(groupObject)[0];
      const item = document.createElement('a');
      item.classList.add('settings','item')
      item.textContent = key;
      item.id = key
  
      item.addEventListener('click', () => {
        // Get all menu items
        const menuItems = document.querySelectorAll(".settings.item");
        menuItems.forEach((item) => {
          item.classList.remove("active");
        });
        item.classList.add("active")
        ipcRenderer.send('navigate-tab', key);
      });
      menu.appendChild(item);
    });
  
    const search = document.createElement('div')
    search.classList.add('right', 'menu')
    search.innerHTML = '<div class="right menu"> \
                          <div class="item"> \
                          <div class="ui transparent icon input">\
                          <input type="text" placeholder="Search..." id="searchinput">\
                          <i class="search link icon"></i>\
                          </div></div></div>'
    menu.appendChild(search);
  
    // // first tab visible
    const element = document.querySelector("#" + firsttab);
    element.click();
  });

});

document.addEventListener("DOMContentLoaded", function () {
  const configPath = document.querySelector('#config_file_path');
  configPath.textContent = app.getAppPath() + '/qvp.conf'

  const save = document.querySelector('#save-workspace');
  save.addEventListener('click', function () {
    console.log('save')
  });


  const configChange = document.querySelector('#change-config-path');
  configChange.addEventListener('click', function () {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.conf';
    input.style.display = 'none'; // Hide the file input

    input.click();

    // Listen for file selection and update the label
    input.addEventListener('change', () => {
      if (input.files.length > 0) {
        configPath.textContent = input.files[0].path
        ipcRenderer.send('config-file-changed', input.files[0].path)
      }
    });    
  });

  const edit = document.querySelector('#open-editor');
  edit.addEventListener('click', function () {
    const filePath = document.querySelector('#config_file_path').textContent
    console.log(filePath)
    shell.openItem(filePath);    
  });

  ipcRenderer.send('config-file-changed', app.getAppPath() + '/qvp.conf')
});