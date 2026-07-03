import { spawn, type ChildProcess } from 'child_process'
import { decodeTypeMap, type AudioData } from 'node-carplay/node'

const createAudioKey = (decodeType: number, audioType: number): string => {
  const format = decodeTypeMap[decodeType]
  if (!format) return `unknown_${decodeType}_${audioType}`
  return `${format.frequency}_${format.channel}_${audioType}`
}

class AudioStream {
  private proc: ChildProcess | null = null

  constructor(
    private readonly frequency: number,
    private readonly channels: number
  ) {}

  start(): void {
    const device = process.env.CARPLAY_ALSA_DEVICE
    const args = [
      '-q',
      '-f',
      'S16_LE',
      '-r',
      String(this.frequency),
      '-c',
      String(this.channels),
      '-t',
      'raw'
    ]
    if (device) {
      args.unshift('-D', device)
    }

    this.proc = spawn('aplay', args, { stdio: ['pipe', 'ignore', 'ignore'] })
    this.proc.on('error', (err) => {
      console.error(`[audio] aplay error (${this.frequency}Hz):`, err.message)
    })
  }

  write(data: Int16Array): void {
    if (!this.proc?.stdin?.writable) return
    this.proc.stdin.write(Buffer.from(data.buffer, data.byteOffset, data.byteLength))
  }

  stop(): void {
    this.proc?.stdin?.end()
    this.proc?.kill('SIGTERM')
    this.proc = null
  }
}

export class NativeAudio {
  private readonly streams = new Map<string, AudioStream>()

  write(audio: AudioData): void {
    if (!audio.data?.length) return

    const key = createAudioKey(audio.decodeType, audio.audioType)
    let stream = this.streams.get(key)
    if (!stream) {
      const format = decodeTypeMap[audio.decodeType]
      if (!format) {
        console.warn(`[audio] unknown decode type: ${audio.decodeType}`)
        return
      }
      stream = new AudioStream(format.frequency, format.channel)
      stream.start()
      this.streams.set(key, stream)
      console.log(`[audio] stream opened: ${key}`)
    }

    stream.write(audio.data)
  }

  stop(): void {
    this.streams.forEach((stream) => stream.stop())
    this.streams.clear()
  }
}
