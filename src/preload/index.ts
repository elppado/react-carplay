import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

export interface Api {
  quit: () => void
}

const api: Api = {
  quit: () => ipcRenderer.send('quit')
}

try {
  contextBridge.exposeInMainWorld('electron', electronAPI)
  contextBridge.exposeInMainWorld('api', api)
  contextBridge.exposeInMainWorld('electronAPI', {
    quit: () => ipcRenderer.send('quit')
  })
} catch (error) {
  console.error(error)
}
