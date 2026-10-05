import { readFileSync, existsSync } from 'fs'
import { createReadStream, type ReadStream } from 'fs'
import { open } from 'fs/promises'

const EV_SYN = 0
const EV_KEY = 1
const EV_ABS = 3
const SYN_REPORT = 0
const ABS_X = 0
const ABS_Y = 1
const ABS_MT_POSITION_X = 53
const ABS_MT_POSITION_Y = 54
const BTN_TOUCH = 0x14a
const INPUT_EVENT_SIZE = 24

export type TouchHandler = (touch: { type: number; x: number; y: number }) => void
export type KeyHandler = (keyCode: number) => void

const parseInputDevices = (): { touchPaths: string[]; keyPaths: string[] } => {
  const touchPaths: string[] = []
  const keyPaths: string[] = []

  try {
    const devices = readFileSync('/proc/bus/input/devices', 'utf8')
    const blocks = devices.split('\n\n')

    for (const block of blocks) {
      const nameMatch = block.match(/^N: Name="(.+)"/m)
      const handlersMatch = block.match(/^H: Handlers=(.+)$/m)
      if (!handlersMatch) continue

      const handlers = handlersMatch[1]
      const eventMatch = handlers.match(/event(\d+)/)
      if (!eventMatch) continue

      const path = `/dev/input/event${eventMatch[1]}`
      const name = (nameMatch?.[1] ?? '').toLowerCase()
      const isTouch =
        name.includes('touch') ||
        name.includes('ts') ||
        block.includes('ABS') && (name.includes('lcd') || name.includes('display'))
      const isKeyboard = handlers.includes('kbd') || name.includes('keyboard')

      if (isTouch) touchPaths.push(path)
      else if (isKeyboard) keyPaths.push(path)
    }
  } catch {
    // /proc may be unavailable in dev containers
  }

  return { touchPaths, keyPaths }
}

export const resolveInputDevice = (
  envVar: string | undefined,
  fallbackPaths: string[]
): string | null => {
  if (envVar && existsSync(envVar)) return envVar
  return fallbackPaths.find((p) => existsSync(p)) ?? null
}

export class EvdevReader {
  private stream: ReadStream | null = null
  private buffer = Buffer.alloc(0)
  private x = 0
  private y = 0
  private lastX = -1
  private lastY = -1
  private xMax = 0
  private yMax = 0
  private touching = false
  private wasTouching = false

  constructor(
    private readonly devicePath: string,
    private readonly onTouch: TouchHandler,
    private readonly onKey?: KeyHandler
  ) {}

  async start(): Promise<void> {
    const handle = await open(this.devicePath, 'r')
    await handle.close()

    console.log(`[input] watching ${this.devicePath}`)
    this.stream = createReadStream(this.devicePath)
    this.stream.on('data', (chunk: Buffer) => this.handleData(chunk))
    this.stream.on('error', (err) => {
      console.error(`[input] ${this.devicePath} error:`, err.message)
    })
  }

  stop(): void {
    this.stream?.destroy()
    this.stream = null
    this.buffer = Buffer.alloc(0)
  }

  private handleData(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk])

    while (this.buffer.length >= INPUT_EVENT_SIZE) {
      const event = this.buffer.subarray(0, INPUT_EVENT_SIZE)
      this.buffer = this.buffer.subarray(INPUT_EVENT_SIZE)
      this.parseEvent(event)
    }
  }

  private parseEvent(event: Buffer): void {
    const type = event.readUInt16LE(16)
    const code = event.readUInt16LE(18)
    const value = event.readInt32LE(20)

    if (type === EV_ABS) {
      if (code === ABS_X || code === ABS_MT_POSITION_X) {
        this.x = value
        this.xMax = Math.max(this.xMax, value)
      } else if (code === ABS_Y || code === ABS_MT_POSITION_Y) {
        this.y = value
        this.yMax = Math.max(this.yMax, value)
      }
    } else if (type === EV_KEY) {
      if (code === BTN_TOUCH) {
        this.touching = value === 1
      } else if (value === 1 && this.onKey) {
        this.onKey(code)
      }
    } else if (type === EV_SYN && code === SYN_REPORT) {
      if (this.xMax <= 0 || this.yMax <= 0) return

      const normX = Math.min(1, Math.max(0, this.x / this.xMax))
      const normY = Math.min(1, Math.max(0, this.y / this.yMax))
      const moved = normX !== this.lastX || normY !== this.lastY

      let touchType: number | null = null
      if (this.touching && !this.wasTouching) {
        touchType = 14 // TouchAction.Down
      } else if (!this.touching && this.wasTouching) {
        touchType = 16 // TouchAction.Up
      } else if (this.touching && this.wasTouching && moved) {
        touchType = 15 // TouchAction.Move
      }

      if (touchType != null) {
        this.onTouch({ type: touchType, x: normX, y: normY })
        this.lastX = normX
        this.lastY = normY
      }

      this.wasTouching = this.touching
    }
  }
}

export const discoverInputDevices = (): { touch: string | null; keyboard: string | null } => {
  const { touchPaths, keyPaths } = parseInputDevices()
  return {
    touch: resolveInputDevice(process.env.CARPLAY_TOUCH_DEVICE, touchPaths),
    keyboard: resolveInputDevice(process.env.CARPLAY_KEY_DEVICE, keyPaths)
  }
}
