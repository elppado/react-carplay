import { isArmLinux } from '../shared/platform'
import { isPiCm5, isRaspberryPi } from './platform'

type ChromiumSwitch = [string, string?]

const commonSwitches: ChromiumSwitch[] = [
  ['autoplay-policy', 'no-user-gesture-required'],
  ['disable-webusb-security', 'true'],
  ['enable-gpu-rasterization'],
  ['enable-zero-copy'],
  ['ignore-gpu-blocklist'],
  ['enable-native-gpu-memory-buffers'],
  ['enable-accelerated-2d-canvas'],
  ['enable-accelerated-mjpeg-decode'],
  ['enable-accelerated-video-decode']
]

const piSwitches: ChromiumSwitch[] = [
  ['use-gl', 'egl'],
  ['enable-features', 'VaapiVideoDecoder,V4L2FlatStatelessVideoDecoder,UseSkiaRenderer'],
  ['disable-features', 'UseChromeOSDirectVideoDecoder'],
  ['num-raster-threads', '2'],
  ['disable-gpu-driver-bug-workarounds'],
  ['disable-software-rasterizer']
]

const cm5Switches: ChromiumSwitch[] = [['in-process-gpu']]

export function applyPlatformSwitches(appendSwitch: (name: string, value?: string) => void): void {
  const switches = [...commonSwitches]

  if (isArmLinux()) {
    switches.push(...piSwitches)
  }

  if (isPiCm5()) {
    switches.push(...cm5Switches)
  }

  for (const [name, value] of switches) {
    appendSwitch(name, value || '')
  }
}

export function getWindowOptionsForPlatform(): {
  transparent: boolean
  fullscreen: boolean
} {
  if (!isRaspberryPi()) {
    return { transparent: true, fullscreen: false }
  }

  return { transparent: false, fullscreen: true }
}
