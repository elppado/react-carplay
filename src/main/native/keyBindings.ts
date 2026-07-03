import type { KeyBindings } from '../Globals'

// Linux input event codes (include/uapi/linux/input-event-codes.h)
const KEY_BACKSPACE = 14
const KEY_SPACE = 57
const KEY_LEFT = 105
const KEY_RIGHT = 106
const KEY_DOWN = 108
const KEY_H = 35
const KEY_P = 25
const KEY_O = 24
const KEY_M = 50
const KEY_N = 49
const KEY_S = 31
const KEY_Z = 44
const KEY_X = 45

const WEB_CODE_TO_LINUX: Record<string, number> = {
  Backspace: KEY_BACKSPACE,
  Space: KEY_SPACE,
  ArrowLeft: KEY_LEFT,
  ArrowRight: KEY_RIGHT,
  ArrowDown: KEY_DOWN,
  KeyH: KEY_H,
  KeyP: KEY_P,
  KeyO: KEY_O,
  KeyM: KEY_M,
  KeyN: KEY_N,
  KeyS: KEY_S,
  KeyZ: KEY_Z,
  KeyX: KEY_X
}

export type KeyCommand =
  | 'left'
  | 'right'
  | 'selectDown'
  | 'back'
  | 'down'
  | 'home'
  | 'play'
  | 'pause'
  | 'next'
  | 'prev'
  | 'siri'
  | 'enableNightMode'
  | 'disableNightMode'

export const buildKeyCodeMap = (bindings: KeyBindings): Map<number, KeyCommand> => {
  const map = new Map<number, KeyCommand>()
  for (const [command, webCode] of Object.entries(bindings) as [KeyCommand, string][]) {
    const linuxCode = WEB_CODE_TO_LINUX[webCode]
    if (linuxCode != null) {
      map.set(linuxCode, command)
    }
  }
  return map
}
