import { create } from 'zustand'
import { ExtraConfig } from '../../../main/Globals'
import { io, Socket } from 'socket.io-client'
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

const START_PORT = 4000
const MAX_PORT = 4010

let socket: Socket | null = null
let currentPort = START_PORT

const bindSocketHandlers = (activeSocket: Socket) => {
  activeSocket.on('settings', (settings: ExtraConfig) => {
    console.log('received settings', settings)
    useCarplayStore.setState(() => ({ settings }))
  })

  activeSocket.on('reverse', (reverse: boolean) => {
    console.log('reverse data', reverse)
    useStatusStore.setState(() => ({ reverse }))
  })
}

const connectSocket = (port: number): Socket => {
  const activeSocket = io(`http://localhost:${port}`)
  bindSocketHandlers(activeSocket)
  return activeSocket
}

const handleConnectError = () => {
  if (currentPort >= MAX_PORT) {
    console.error(`Failed to connect to Socket.IO server on ports ${START_PORT}-${MAX_PORT}`)
    return
  }

  console.log(`Failed to connect to port ${currentPort}, trying ${currentPort + 1}`)
  switchSocketPort(currentPort + 1)
}

const switchSocketPort = (port: number) => {
  if (socket) {
    socket.off('connect_error', handleConnectError)
    socket.removeAllListeners()
    socket.disconnect()
  }

  currentPort = port
  socket = connectSocket(port)
  socket.on('connect_error', handleConnectError)
}

switchSocketPort(START_PORT)

export const useCarplayStore = create<CarplayStore>()(() => ({
  settings: null,
  getSettings: (): void => {
    socket?.emit('getSettings')
  },
  stream: (stream): void => {
    socket?.emit('stream', stream)
  }
}))

export const useStatusStore = create<StatusStore>()((set) => ({
  reverse: false,
  lights: false,
  setReverse: (reverse): void => {
    set(() => ({ reverse }))
  }
}))
