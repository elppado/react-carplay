import { readFileSync } from 'fs'
import { isArmLinux } from '../shared/platform'

export function isRaspberryPi(): boolean {
  if (!isArmLinux()) return false

  try {
    const cpuinfo = readFileSync('/proc/cpuinfo', 'utf8')
    return /BCM2712|BCM2835|BCM2836|BCM2837|BCM2711|Raspberry Pi/i.test(cpuinfo)
  } catch {
    return true
  }
}

export function isPiCm5(): boolean {
  if (!isArmLinux()) return false

  try {
    const cpuinfo = readFileSync('/proc/cpuinfo', 'utf8')
    return /BCM2712/i.test(cpuinfo)
  } catch {
    return false
  }
}
