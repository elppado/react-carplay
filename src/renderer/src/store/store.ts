import { create } from 'zustand'
import { ExtraConfig } from '../../../main/Globals'
import { DEFAULT_EXTRA_CONFIG } from '../../../shared/defaultExtraConfig'
import { io, Socket } from 'socket.io-client'
import { Stream } from 'socketmost/dist/modules/Messages'

interface CarplayStore {
  settings: ExtraConfig
  getSettings: () => void
  stream: (stream: Stream) => void
}

const START_PORT = 4000
const MAX_PORT = 4010

let socket: Socket | null = null
let currentPort = START_PORT

const bindSocketHandlers = (activeSocket: Socket) => {
  activeSocket.on('settings', (settings: ExtraConfig) => {
    useCarplayStore.setState(() => ({ settings }))
  })
}

const connectSocket = (port: number): Socket => {
  const activeSocket = io(`http://localhost:${port}`, {
    transports: ['websocket'],
    autoConnect: true
  })
  bindSocketHandlers(activeSocket)
  return activeSocket
}

const handleConnectError = () => {
  if (currentPort >= MAX_PORT) {
    console.error(`Failed to connect to Socket.IO server on ports ${START_PORT}-${MAX_PORT}`)
    return
  }

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
  settings: DEFAULT_EXTRA_CONFIG,
  getSettings: (): void => {
    socket?.emit('getSettings')
  },
  stream: (stream): void => {
    socket?.emit('stream', stream)
  }
}))
