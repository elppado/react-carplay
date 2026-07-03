import { app, shell, BrowserWindow, session } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { DEFAULT_EXTRA_CONFIG } from '../shared/defaultExtraConfig'
import { Socket } from './Socket'
import { ExtraConfig } from './Globals'

let mainWindow: BrowserWindow
const config: ExtraConfig = DEFAULT_EXTRA_CONFIG

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

  mainWindow.webContents.session.setPermissionCheckHandler(() => true)
  mainWindow.webContents.session.setDevicePermissionHandler(
    (details) => details.device.vendorId === 4884
  )

  mainWindow.webContents.session.on('select-usb-device', (event, details, callback) => {
    event.preventDefault()
    const selectedDevice = details.deviceList.find(
      (device) => device.vendorId === 4884 && device.productId === 5408
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

app.commandLine.appendSwitch('enable-experimental-web-platform-features')

app.whenReady().then(() => {
  createWindow()

  new Socket(config)

  electronApp.setAppUserModelId('com.electron')

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp'
      }
    })
  })

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
