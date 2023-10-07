const { BrowserWindow } = require('electron').remote
const { ipcRenderer } = require('electron');
const settings = require('electron-settings')

const sudoPasswd = document.getElementById('sudo-button')
sudoPasswd.addEventListener('click', (event) => {
    ipcRenderer.send('sudo-passwd-update');
})

ipcRenderer.on('password-updated', (event, passwd) => {
    console.log(passwd);
    settings.set('passwd', passwd);
});

function getPasswd(){
    let passwd = settings.get('passwd');
    if (!passwd) {
        document.getElementById('sudo-button').click()
    }
    return settings.get('passwd')
}

module.exports = {
    getPasswd: getPasswd
}