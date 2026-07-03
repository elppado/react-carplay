import { spawn, type ChildProcess } from 'child_process'

const V4L2_PIPELINE =
  'fdsrc fd=0 blocksize=65536 ! h264parse config-interval=-1 ! v4l2slh264dec ! videoconvert ! kmssink sync=false'
const SOFTWARE_PIPELINE =
  'fdsrc fd=0 blocksize=65536 ! h264parse config-interval=-1 ! avdec_h264 ! autovideosink sync=false'

export class GStreamerVideo {
  private proc: ChildProcess | null = null
  private useHardware: boolean

  constructor(useHardware = true) {
    this.useHardware = useHardware && process.env.CARPLAY_SOFTWARE_DECODE !== '1'
  }

  start(): void {
    if (this.proc) return

    const pipeline = process.env.CARPLAY_GSTREAMER_PIPELINE
      ? process.env.CARPLAY_GSTREAMER_PIPELINE
      : this.useHardware
        ? V4L2_PIPELINE
        : SOFTWARE_PIPELINE

    console.log(`[video] starting GStreamer (${this.useHardware ? 'hardware' : 'software'})`)

    const proc = spawn('gst-launch-1.0', ['-qe', pipeline], {
      stdio: ['pipe', 'inherit', 'inherit']
    })
    this.proc = proc

    proc.on('error', (err) => {
      console.error('[video] GStreamer spawn error:', err.message)
      if (this.useHardware) {
        console.log('[video] retrying with software decoder')
        this.useHardware = false
        this.proc = null
        this.start()
      }
    })

    proc.on('exit', (code, signal) => {
      console.log(`[video] GStreamer exited (code=${code}, signal=${signal})`)
      this.proc = null
    })
  }

  write(data: Buffer): void {
    if (!this.proc?.stdin?.writable) return
    this.proc.stdin.write(data)
  }

  stop(): void {
    if (!this.proc) return
    this.proc.stdin?.end()
    this.proc.kill('SIGTERM')
    this.proc = null
  }
}
