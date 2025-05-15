import { create } from 'zustand'
import { ExtraConfig } from '../../../main/Globals'
import { io } from 'socket.io-client'
import { Stream } from 'socketmost/dist/modules/Messages'

interface CarplayStore {
  settings: null | ExtraConfig
  getSettings: () => void
  stream: (stream: Stream) => void
}

interface StatusStore {
  reverse: boolean
  lights: boolean
  setReverse: (reverse: boolean) => void
}

const connectSocket = (port: number) => {
  const URL = `http://localhost:${port}`
  const socket = io(URL)

  socket.on('settings', (settings: ExtraConfig) => {
    console.log('received settings', settings)
    useCarplayStore.setState(() => ({ settings: settings }))
  })

  socket.on('reverse', (reverse) => {
    console.log('reverse data', reverse)
    useStatusStore.setState(() => ({ reverse: reverse }))
  })

  return socket
}

// Try ports starting from 4000
let currentPort = 4000
let socket = connectSocket(currentPort)

socket.on('connect_error', () => {
  console.log(`Failed to connect to port ${currentPort}, trying ${currentPort + 1}`)
  currentPort++
  socket = connectSocket(currentPort)
})

export const useCarplayStore = create<CarplayStore>()((set) => ({
  settings: null,
  getSettings: (): void => {
    socket.emit('getSettings')
  },
  stream: (stream): void => {
    socket.emit('stream', stream)
  }
}))

export const useStatusStore = create<StatusStore>()((set) => ({
  reverse: false,
  lights: false,
  setReverse: (reverse):void => {
    set(() => ({ reverse: reverse }))
  }
}))