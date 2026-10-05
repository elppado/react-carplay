import { isPiCm5, isRaspberryPi } from './platform'

type ChromiumSwitch = [string, string?]

const essentialSwitches: ChromiumSwitch[] = [
  ['autoplay-policy', 'no-user-gesture-required'],
  ['disable-webusb-security', 'true']
]

const piGpuSwitches: ChromiumSwitch[] = [
  ['use-gl', 'egl'],
  ['enable-gpu-rasterization'],
  ['enable-zero-copy'],
  ['ignore-gpu-blocklist'],
  ['enable-native-gpu-memory-buffers'],
  ['enable-accelerated-2d-canvas'],
  ['enable-accelerated-mjpeg-decode'],
  ['enable-accelerated-video-decode'],
  ['enable-features', 'VaapiVideoDecoder,V4L2FlatStatelessVideoDecoder']
]

const softwareRenderSwitches: ChromiumSwitch[] = [
  ['disable-gpu'],
  ['disable-gpu-compositing']
]

export function applyPlatformSwitches(appendSwitch: (name: string, value?: string) => void): void {
  const useSoftwareRender =
    process.env.CARPLAY_SOFTWARE_RENDER === '1' || process.env.ELECTRON_DISABLE_GPU === '1'

  const switches: ChromiumSwitch[] = [...essentialSwitches]

  if (useSoftwareRender) {
    switches.push(...softwareRenderSwitches)
  } else if (isRaspberryPi() && process.env.CARPLAY_HARDWARE_GPU === '1') {
    switches.push(...piGpuSwitches)
    if (isPiCm5() && process.env.CARPLAY_IN_PROCESS_GPU === '1') {
      switches.push(['in-process-gpu'])
    }
  } else if (isRaspberryPi()) {
    // Safer Pi default: avoid forcing EGL until hardware GPU is confirmed working.
    switches.push(['ignore-gpu-blocklist'])
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
