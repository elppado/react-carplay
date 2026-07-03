import CarplayNode, { TouchAction } from 'node-carplay/node'
import type { ExtraConfig } from '../Globals'
import { GStreamerVideo } from './GStreamerVideo'
import { NativeAudio } from './NativeAudio'
import { EvdevReader, discoverInputDevices } from './evdev'
import { buildKeyCodeMap, type KeyCommand } from './keyBindings'

type NativeMessage = Parameters<NonNullable<CarplayNode['onmessage']>>[0]

export class CarplayNativeApp {
  private readonly carplay: CarplayNode
  private readonly video: GStreamerVideo
  private readonly audio: NativeAudio
  private readonly keyMap: Map<number, KeyCommand>
  private touchReader: EvdevReader | null = null
  private keyReader: EvdevReader | null = null
  private running = false

  constructor(config: ExtraConfig) {
    this.carplay = new CarplayNode(config)
    this.video = new GStreamerVideo()
    this.audio = new NativeAudio()
    this.keyMap = buildKeyCodeMap(config.bindings)
  }

  async start(): Promise<void> {
    if (this.running) return
    this.running = true

    this.carplay.onmessage = (message: NativeMessage) => this.handleMessage(message)
    this.video.start()
    await this.startInput()
    await this.carplay.start()

    console.log('[native] CarPlay session started (GStreamer + ALSA)')
  }

  async stop(): Promise<void> {
    this.running = false
    this.touchReader?.stop()
    this.keyReader?.stop()
    this.touchReader = null
    this.keyReader = null
    this.video.stop()
    this.audio.stop()
    await this.carplay.stop()
  }

  private handleMessage(message: NativeMessage): void {
    switch (message.type) {
      case 'plugged':
        console.log('[native] phone connected')
        this.carplay.sendKey('frame')
        break
      case 'unplugged':
        console.log('[native] phone disconnected')
        break
      case 'video':
        this.video.write(message.message.data)
        break
      case 'audio':
        this.audio.write(message.message)
        break
      case 'failure':
        console.error('[native] dongle failure')
        break
      case 'media':
        if (message.message.payload?.type === 1) {
          const media = message.message.payload.media
          if (media.MediaSongName) {
            console.log(`[media] ${media.MediaArtistName ?? ''} - ${media.MediaSongName}`)
          }
        }
        break
      case 'command':
        break
    }
  }

  private async startInput(): Promise<void> {
    const { touch, keyboard } = discoverInputDevices()

    if (touch) {
      this.touchReader = new EvdevReader(touch, ({ type, x, y }) => {
        this.carplay.sendTouch({ type, x, y })
      })
      await this.touchReader.start()
    } else {
      console.warn('[input] no touchscreen found (set CARPLAY_TOUCH_DEVICE)')
    }

    if (keyboard) {
      this.keyReader = new EvdevReader(
        keyboard,
        () => {
          /* touch unused on keyboard device */
        },
        (keyCode) => {
          const command = this.keyMap.get(keyCode)
          if (command) {
            this.carplay.sendKey(command)
          }
        }
      )
      await this.keyReader.start()
    } else {
      console.warn('[input] no keyboard found (set CARPLAY_KEY_DEVICE)')
    }
  }
}

// Re-export TouchAction for tests / tooling
export { TouchAction }
