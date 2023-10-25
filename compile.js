const electronInstaller = require('electron-winstaller');
const path = require('path');

async function start() {
  // NB: Use this syntax within an async function, Node does not have support for
  //     top-level await as of Node 12.
  try {
    await electronInstaller.createWindowsInstaller({
      appDirectory: path.join(__dirname, 'release', 'app'),
      outputDirectory: path.join(__dirname, 'release', 'packed'),
      authors: 'My App Inc.',
      exe: 'myapp.exe',
    });
    console.log('It worked!');
  } catch (e) {
    console.log(`No dice: ${e.message}`);
  }
}

start();
