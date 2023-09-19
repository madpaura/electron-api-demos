const { table } = require('console')
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
  const app = document.getElementById('tab-contents');
  app.innerHTML = '';

  jsonData[tab].forEach((item) => {
    const element = createUIElement(item);
    app.appendChild(element);
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
      input.checked = item.value
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
        console.log(input.files)
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
    const menu = document.getElementById('tab-menu');
    
    // Using Object.keys()
    const tabs = Object.keys(jsonData);

    tabs.forEach(key => {
      const item = document.createElement('a');
      item.classList.add('item')
      item.textContent = key;
      item.id = key

      item.addEventListener('click', () => {
        // Get all menu items
        const menuItems = document.querySelectorAll(".item");
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

    // first tab visible
    const element = document.querySelector("#"+tabs[0]);
    element.click();
  });
