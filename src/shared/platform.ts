export function isArmLinux(): boolean {
  return typeof process !== 'undefined' && process.platform === 'linux' && process.arch === 'arm64'
}
