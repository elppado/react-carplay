import { create } from 'zustand'
import { ExtraConfig } from '../../../main/Globals'

interface CarplayStore {
  settings: null | ExtraConfig
  saveSettings: (settings: ExtraConfig) => void
  getSettings: () => void
}

interface StatusStore {
  reverse: boolean
  lights: boolean
  setReverse: (reverse: boolean) => void
}

export const useCarplayStore = create<CarplayStore>()((set) => ({
  settings: null,
  saveSettings: (settings: ExtraConfig): void => {
    set(() => ({ settings: settings }))
  },
  getSettings: (): void => {
  }
}))

export const useStatusStore = create<StatusStore>()((set) => ({
  reverse: false,
  lights: false,
  setReverse: (reverse: boolean): void => {
    set(() => ({ reverse: reverse }))
  }
}))