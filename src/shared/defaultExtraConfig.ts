import type { ExtraConfig, KeyBindings } from '../main/Globals'
import { isArmLinux } from './platform'

// Inlined from node-carplay DEFAULT_CONFIG to avoid requiring the ESM package in Electron main.
const DONGLE_DEFAULT_CONFIG = {
  width: 800,
  height: 640,
  fps: 20,
  dpi: 160,
  format: 5,
  iBoxVersion: 2,
  phoneWorkMode: 2,
  packetMax: 49152,
  boxName: 'nodePlay',
  nightMode: false,
  hand: 0,
  mediaDelay: 300,
  audioTransferMode: false,
  wifiType: '5ghz' as const,
  micType: 'os' as const,
  phoneConfig: {
    3: { frameInterval: 5000 },
    5: { frameInterval: null as number | null }
  }
}

export const DEFAULT_BINDINGS: KeyBindings = {
  left: 'ArrowLeft',
  right: 'ArrowRight',
  selectDown: 'Space',
  back: 'Backspace',
  down: 'ArrowDown',
  home: 'KeyH',
  play: 'KeyP',
  pause: 'KeyO',
  next: 'KeyM',
  prev: 'KeyN',
  siri: 'KeyS',
  enableNightMode: 'KeyZ',
  disableNightMode: 'KeyX'
}

const piDefaults = isArmLinux()
  ? {
      fps: 30,
      dpi: 240,
      kiosk: true,
      mediaDelay: 0
    }
  : {}

export const DEFAULT_EXTRA_CONFIG: ExtraConfig = {
  ...DONGLE_DEFAULT_CONFIG,
  width: 1920,
  height: 720,
  dpi: 300,
  kiosk: false,
  bindings: DEFAULT_BINDINGS,
  ...piDefaults
}
