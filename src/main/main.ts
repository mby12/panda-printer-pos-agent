/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import {
  app,
  BrowserWindow,
  shell,
  ipcMain,
  nativeImage,
  Tray,
  Menu,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {
  Alignment,
  CustomTableItem,
  FontFamily,
  Printer,
  StyleString,
} from '@node-escpos/core';
// install escpos-usb adapter module manually
import USB from '@node-escpos/usb-adapter';
import express from 'express';
import moment from 'moment';
import Store from 'electron-store';
import cors from 'cors';
import MenuBuilder from './menu';
import { UsbPrinterParameter } from '../types/types';
import { resolveHtmlPath } from './util';

const store = new Store();
const expressApp = express();

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}
const gotTheLock = app.requestSingleInstanceLock();

let tray = null;

const RESOURCES_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'assets')
  : path.join(__dirname, '../../assets');

const getAssetPath = (...paths: string[]): string => {
  return path.join(RESOURCES_PATH, ...paths);
};

let mainWindow: BrowserWindow | null = null;

ipcMain.on('usb-list', async (event, _arg) => {
  const deviceList = USB.findPrinter();

  event.reply('usb-list', deviceList);
  // console.log();;
});

ipcMain.on('get-selected-usb-device', async (event, _arg) => {
  event.reply('get-selected-usb-device', store.get('selected-usb-device'));
});

ipcMain.on('set-selected-usb-device', async (event, device) => {
  if (device === undefined) {
    store.delete('selected-usb-device');
    return;
  }
  event.reply(
    'set-selected-usb-device',
    store.set('selected-usb-device', device),
  );
});

function
doUsbPrint(arg) {
  if(!arg) return;
  const cachedSelectedUsb = store.get('selected-usb-device');
  if (cachedSelectedUsb === undefined) {
    throw new Error('No Device Selected');
  }

  const device = new USB(
    cachedSelectedUsb?.deviceDescriptor?.idVendor,
    cachedSelectedUsb.deviceDescriptor.idProduct,
  );
  // // device.on()

  device.open(async function (err) {
    if (err) {
      // handle error
      return;
    }

    // encoding is optional
    const options = { encoding: 'GB18030' /* default */ };
    const printer = new Printer(device, options);

    // eslint-disable-next-line no-restricted-syntax
    for (const printArg of arg) {
      const { CMD, ARGS } = printArg;
      switch (CMD) {
        case 'ALIGN':
          printer.align(ARGS as Alignment);
          break;
        case 'FEED':
          printer.feed(ARGS as number);
          break;
        case 'FONT':
          printer.font(ARGS as FontFamily);
          break;
        case 'LINE_SPACE':
          printer.lineSpace(ARGS as number);
          break;
        case 'STYLE':
          printer.style(ARGS as StyleString);
          break;
        case 'TEXT':
          printer.text(ARGS as string);
          break;
        case 'TABLE':
          printer.tableCustom(ARGS as CustomTableItem[]);
          break;
        default:
          break;
      }
    }

    printer.cut().close();
  });
  // event.reply('usb-do-print', arg);
}

ipcMain.on('usb-do-print', async (event, arg: UsbPrinterParameter[]) => {
  try {
    doUsbPrint(arg);
  } catch (error: any) {
    event.reply('usb-do-print', error?.message || 'Failed to print');
  }
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

function createTray() {
  const icon = getAssetPath('icon.png');
  const trayIcon = nativeImage.createFromPath(icon);
  tray = new Tray(trayIcon.resize({ width: 16 }));
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show',
      click: () => {
        if (mainWindow === null) createWindow();
      },
    },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);
  tray.setToolTip('Thermal Printer Server');
  tray.setContextMenu(contextMenu);
}

expressApp.use(cors());
expressApp.use(express.json());
expressApp.post('/', (req, res) => {
  try {
    const { payload } = req.body || {};
    doUsbPrint(payload);
    return res.json({
      success: true,
      message: 'Printed Successfully',
    });
  } catch (error: any) {
    return res.json({
      success: false,
      message: error?.message || 'Unknown Error',
    });
  }
});
/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    // app.quit();
  } else {
    app.dock.hide();
  }
});

if (!gotTheLock) {
  app.quit();
} else {
  app.on(
    'second-instance',
    (event, commandLine, workingDirectory, additionalData) => {
      // Print out data received from the second instance.
      console.log(additionalData);

      // Someone tried to run a second instance, we should focus our window.
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
    },
  );

  app
    .whenReady()
    .then(() => {
      // console.log();

      if (process.defaultApp) {
        if (process.argv.length >= 2) {
          app.setAsDefaultProtocolClient(
            'pos-printer-agent',
            process.execPath,
            [path.resolve(process.argv.find((v) => v.endsWith('.exe')) || '')],
          );
        }
      } else {
        app.setAsDefaultProtocolClient('pos-printer-agent');
      }
      createWindow();
      createTray();
      expressApp.listen(45214, function () {
        console.log('express app is ready');
      });
      app.on('activate', () => {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (mainWindow === null) createWindow();
      });
    })
    .catch(console.log);
}
