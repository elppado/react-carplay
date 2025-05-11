import {
  app,
  shell,
  BrowserWindow,
  session,
  systemPreferences,
  IpcMainEvent,
  ipcMain
} from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { DEFAULT_CONFIG } from 'node-carplay/node'
import * as fs from 'fs'
import { ExtraConfig, KeyBindings } from './Globals'

let mainWindow: BrowserWindow
const appPath: string = app.getPath('userData')
const configPath: string = appPath + '/config.json'
let config: null | ExtraConfig

const DEFAULT_BINDINGS: KeyBindings = {
  left: 'ArrowLeft',
  right: 'ArrowRight',
  selectDown: 'Space',
  back: 'Backspace',
  down: 'ArrowDown',
  home: 'KeyH',
  play: 'KeyP',
  pause: 'KeyO',
  next: 'KeyM',
  prev: 'KeyN',
  siri: 'KeyS',
  enableNightMode: 'KeyZ',
  disableNightMode: 'KeyX'
}

const EXTRA_CONFIG: ExtraConfig = {
  ...DEFAULT_CONFIG,
  kiosk: false,
  camera: '',
  microphone: '',
  bindings: DEFAULT_BINDINGS
}

// Config loading optimization
try {
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    const configKeys = Object.keys(config).sort()
    const defaultKeys = Object.keys(EXTRA_CONFIG).sort()
    if (JSON.stringify(configKeys) !== JSON.stringify(defaultKeys)) {
      config = { ...EXTRA_CONFIG, ...config }
      fs.writeFileSync(configPath, JSON.stringify(config))
    }
  } else {
    fs.writeFileSync(configPath, JSON.stringify(EXTRA_CONFIG))
    config = EXTRA_CONFIG
  }
} catch (error) {
  console.error('Error loading config:', error)
  config = EXTRA_CONFIG
}

const handleSettingsReq = (_: IpcMainEvent) => {
  mainWindow?.webContents.send('settings', config)
}

// Performance optimizations
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')
app.commandLine.appendSwitch('disable-webusb-security', 'true')
app.commandLine.appendSwitch('enable-experimental-web-platform-features')
app.commandLine.appendSwitch('disable-gpu-vsync')
app.commandLine.appendSwitch('disable-frame-rate-limit')
app.commandLine.appendSwitch('enable-zero-copy')
app.commandLine.appendSwitch('ignore-gpu-blocklist')

function createWindow(): void {
  mainWindow = new BrowserWindow({
    transparent: true,
    width: config!.width,
    height: config!.height,
    kiosk: config!.kiosk,
    show: false,
    frame: false,
    fullscreen: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      webSecurity: false,
      backgroundThrottling: false
    }
  })

  mainWindow.setBackgroundColor('#333333')

  // Optimize permissions
  mainWindow.webContents.session.setPermissionCheckHandler(() => true)
  mainWindow.webContents.session.setDevicePermissionHandler((details) => 
    details.device.vendorId === 4884
  )

  mainWindow.webContents.session.on('select-usb-device', (event, details, callback) => {
    event.preventDefault()
    const selectedDevice = details.deviceList.find(
      device => device.vendorId === 4884 && device.productId === 5408
    )
    callback(selectedDevice?.deviceId)
  })

  mainWindow.on('ready-to-show', () => mainWindow.show())

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Optimize headers
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp'
      }
    })
  })
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  // Optimize session headers
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp'
      }
    })
  })

  ipcMain.on('getSettings', handleSettingsReq)
  ipcMain.on('saveSettings', saveSettings)
  ipcMain.on('quit', quit)

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

const saveSettings = (settings: ExtraConfig) => {
  fs.writeFileSync(configPath, JSON.stringify(settings))
}

const quit = (_: IpcMainEvent) => {
  app.quit()
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
