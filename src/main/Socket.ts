import { ExtraConfig } from './Globals'
import { Server } from 'socket.io'

export class Socket {
  config: ExtraConfig
  io: Server
  private port: number = 4000

  constructor(config: ExtraConfig) {
    this.config = config
    this.io = new Server({
      cors: {
        origin: '*'
      }
    })

    this.io.on('connection', (socket) => {
      this.sendSettings()

      socket.on('getSettings', () => {
        this.sendSettings()
      })
    })

    this.startServer()
  }

  private startServer(): void {
    try {
      this.io.listen(this.port)
      console.log(`Socket.IO server listening on port ${this.port}`)
    } catch (error: unknown) {
      const err = error as NodeJS.ErrnoException
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${this.port} is in use, trying ${this.port + 1}`)
        this.port++
        this.startServer()
      } else {
        console.error('Failed to start Socket.IO server:', error)
      }
    }
  }

  sendSettings(): void {
    this.io.emit('settings', this.config)
  }
}
