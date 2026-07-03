import { DEFAULT_CONFIG } from 'node-carplay/node'
import type { ExtraConfig, KeyBindings } from '../main/Globals'

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

export const DEFAULT_EXTRA_CONFIG: ExtraConfig = {
  ...DEFAULT_CONFIG,
  width: 1920,
  height: 720,
  dpi: 300,
  kiosk: false,
  camera: '',
  microphone: '',
  piMost: false,
  canbus: false,
  bindings: DEFAULT_BINDINGS,
  most: {},
  canConfig: {}
}
