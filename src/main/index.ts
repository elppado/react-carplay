import {
  app,
  shell,
  BrowserWindow,
  session,
  ipcMain
} from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { DEFAULT_EXTRA_CONFIG } from '../shared/defaultExtraConfig'
import { Socket } from './Socket'
import { ExtraConfig } from './Globals'

// import * as fs from 'fs'
// import { PiMost } from './PiMost'
// import { Canbus } from './Canbus'

// import { Stream } from 'socketmost/dist/modules/Messages'
// import CarplayNode, {DEFAULT_CONFIG, CarplayMessage} from "node-carplay/node";

let mainWindow: BrowserWindow
let config: ExtraConfig = DEFAULT_EXTRA_CONFIG
let socketServer: Socket

// if(config!.most) {
//   console.log('creating pi most in main')
//   piMost = new PiMost(socket)
// }

// if(config!.canbus) {
//   console.log("Configuring can", config!.canConfig)
//   canbus = new Canbus('can0',  socket, config!.canConfig)
//   canbus.on('lights', (data) => {
//     console.log('lights', data)
//   })
//   canbus.on('reverse', (data) => {
//     mainWindow?.webContents?.send('reverse', data)
//   })
// }

// Performance optimizations
const performanceSwitches = [
  ['autoplay-policy', 'no-user-gesture-required'],
  ['disable-webusb-security', 'true'],
  ['enable-gpu-rasterization'],
  ['enable-zero-copy'],
  ['ignore-gpu-blocklist'],
  ['enable-native-gpu-memory-buffers'],
  ['enable-accelerated-2d-canvas'],
  ['enable-accelerated-mjpeg-decode'],
  ['enable-accelerated-video-decode'],
  ['enable-features', 'VaapiVideoDecoder']
]

performanceSwitches.forEach(([switchName, value]) => {
  app.commandLine.appendSwitch(switchName, value || '')
})

function createWindow(): void {
  mainWindow = new BrowserWindow({
    transparent: true,
    width: config.width,
    height: config.height,
    kiosk: config.kiosk,
    show: true,
    frame: false,
    fullscreen: false,
    autoHideMenuBar: true,
    backgroundColor: '#000000',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      webSecurity: false,
      backgroundThrottling: false
    }
  })

  // USB device handling
  mainWindow.webContents.session.setPermissionCheckHandler(() => true)
  mainWindow.webContents.session.setDevicePermissionHandler((details) => 
    details.device.vendorId === 4884
  )

  mainWindow.webContents.session.on('select-usb-device', (event, details, callback) => {
    event.preventDefault()
    const selectedDevice = details.deviceList.find((device) => 
      device.vendorId === 4884 && device.productId === 5408
    )
    callback(selectedDevice?.deviceId)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.commandLine.appendSwitch('enable-experimental-web-platform-features')

app.whenReady().then(() => {
  createWindow()

  socketServer = new Socket(config)
  electronApp.setAppUserModelId('com.electron')
  // const carplay = new CarplayNode(DEFAULT_CONFIG)
  //
  // carplay.start()
  // carplay.onmessage = (message: CarplayMessage) => {
  //
  //   if (message.type === 'audio') {
  //     mainWindow.webContents.send('audioData', message.message)
  //   }
  // }
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp'
      }
    })
  })

  ipcMain.on('quit', () => {
    app.quit()
  })

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// const startMostStream = (_: IpcMainEvent, most: Stream) => {
//   console.log("stream request")
//   // if(piMost) {
//   //   piMost.stream(most)
//   // }
// }

// const quit = (_: IpcMainEvent) => {
//   app.quit()
// }

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

export { socketServer }
