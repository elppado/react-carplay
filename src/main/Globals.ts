import { DongleConfig } from 'node-carplay/node'

export interface Stream {
  id: number
  type: string
  data: any
}

export type ExtraConfig = DongleConfig & {
  kiosk: boolean
  camera: string
  microphone: string
  bindings: KeyBindings
}

export interface KeyBindings {
  left: string
  right: string
  selectDown: string
  back: string
  down: string
  home: string
  play: string
  pause: string
  next: string
  prev: string
  siri: string
  enableNightMode: string
  disableNightMode: string
}

export interface CanMessage {
  canId: number
  byte: number
  mask: number
}

export interface CanConfig {
  reverse?: CanMessage
  lights?: CanMessage
}
