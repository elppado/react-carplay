// Based on https://github.com/codewithpassion/foxglove-studio-h264-extension/tree/main
// MIT License
import { getDecoderConfig, isKeyFrame } from './lib/utils'
import { InitEvent, RenderEvent, WorkerEvent } from './RenderEvents'
import { WebGLRenderer } from './WebGLRenderer'

export interface FrameRenderer {
  draw(data: VideoFrame): void
}

// eslint-disable-next-line no-restricted-globals
const scope = self as unknown as Worker

export class RenderWorker {
  private renderer: FrameRenderer | null = null
  private videoPort: MessagePort | null = null
  private pendingFrame: VideoFrame | null = null
  private startTime: number | null = null
  private frameCount = 0
  private timestamp = 0
  private fps = 0

  private onVideoDecoderOutput = (frame: VideoFrame) => {
    if (this.startTime == null) {
      this.startTime = performance.now()
    } else {
      const elapsed = (performance.now() - this.startTime) / 1000
      this.fps = ++this.frameCount / elapsed
    }

    this.renderFrame(frame)
  }

  private renderFrame = (frame: VideoFrame) => {
    if (!this.pendingFrame) {
      requestAnimationFrame(this.renderAnimationFrame)
    } else {
      this.pendingFrame.close()
    }
    this.pendingFrame = frame
  }

  private renderAnimationFrame = () => {
    if (this.pendingFrame) {
      this.renderer?.draw(this.pendingFrame)
      this.pendingFrame = null
    }
  }

  private onVideoDecoderOutputError = (err: Error) => {
    console.error(`H264 Render worker decoder error`, err)
  }

  private decoder = new VideoDecoder({
    output: this.onVideoDecoderOutput,
    error: this.onVideoDecoderOutputError
  })

  init = (event: InitEvent) => {
    this.renderer = new WebGLRenderer(event.canvas)
    this.videoPort = event.videoPort
    this.videoPort.onmessage = (ev) => {
      this.onFrame(ev.data as RenderEvent)
    }

    if (event.reportFps) {
      setInterval(() => {
        if (this.decoder.state === 'configured') {
          console.debug(`FPS: ${this.fps}`)
        }
      }, 5000)
    }
  }

  onFrame = (event: RenderEvent) => {
    const frameData = new Uint8Array(event.frameData)

    if (this.decoder.state === 'unconfigured') {
      const decoderConfig = getDecoderConfig(frameData)
      if (decoderConfig) {
        this.decoder.configure(decoderConfig)
        console.log(decoderConfig)
      }
    }
    if (this.decoder.state === 'configured') {
      try {
        this.decoder.decode(
          new EncodedVideoChunk({
            type: isKeyFrame(frameData) ? 'key' : 'delta',
            data: frameData,
            timestamp: this.timestamp++
          })
        )
      } catch (e) {
        console.error(`H264 Render Worker decode error`, e)
      }
    }
  }
}

// eslint-disable-next-line no-restricted-globals
const worker = new RenderWorker()
scope.addEventListener('message', (event: MessageEvent<WorkerEvent>) => {
  if (event.data.type === 'init') {
    worker.init(event.data as InitEvent)
  }
})

export {}
