import { ExtraConfig } from './Globals'
import { Server } from 'socket.io'
import { EventEmitter } from 'events'
import { Stream } from 'socketmost/dist/modules/Messages'

export enum MessageNames {
  Connection = 'connection',
  GetSettings = 'getSettings',
  Stream = 'stream'
}

export class Socket extends EventEmitter {
  config: ExtraConfig
  io: Server
  private port: number = 4000

  constructor(config: ExtraConfig) {
    super()
    this.config = config
    this.io = new Server({
      cors: {
        origin: '*'
      }
    })

    this.io.on(MessageNames.Connection, (socket) => {
      this.sendSettings()

      socket.on(MessageNames.GetSettings, () => {
        this.sendSettings()
      })

      socket.on(MessageNames.Stream, (stream: Stream) => {
        this.emit(MessageNames.Stream, stream)
      })
    })

    this.startServer()
  }

  private startServer(): void {
    try {
      this.io.listen(this.port)
      console.log(`Socket.IO server listening on port ${this.port}`)
    } catch (error: any) {
      if (error.code === 'EADDRINUSE') {
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

  sendReverse(reverse: boolean): void {
    this.io.emit('reverse', reverse)
  }

  sendLights(lights: boolean): void {
    this.io.emit('lights', lights)
  }
}
