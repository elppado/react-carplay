#!/usr/bin/env bash
set -euo pipefail

# Install directory: where this script and the AppImage live (e.g. ~/carplay)
INSTALL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

find_appimage() {
  find "$INSTALL_DIR" -maxdepth 1 -name 'react-carplay-*-cm5-arm64.AppImage' -type f 2>/dev/null | head -n 1
}

find_appimage_fallback() {
  find "$INSTALL_DIR" -maxdepth 1 -name 'react-carplay-*-arm64.AppImage' -type f 2>/dev/null | head -n 1
}

# Native mode is opt-in: requires a built tree (out/main/native.js + node_modules) on the Pi.
# AppImage-only installs should use Electron (default).
try_native_mode() {
  if [[ "${CARPLAY_ELECTRON:-}" == "1" || "${CARPLAY_NATIVE:-}" != "1" ]]; then
    return 1
  fi

  if ! command -v gst-launch-1.0 >/dev/null || ! command -v aplay >/dev/null; then
    echo "Native mode requires gst-launch-1.0 and aplay. Install with setup-pi.sh" >&2
    return 1
  fi

  local native_bin="$INSTALL_DIR/out/main/native.js"
  if [[ ! -f "$native_bin" ]]; then
    echo "Native binary not found at $native_bin" >&2
    echo "Deploy the full build (out/ + node_modules) or use Electron: CARPLAY_ELECTRON=1" >&2
    return 1
  fi

  if [[ ! -d "$INSTALL_DIR/node_modules/node-carplay" ]]; then
    echo "node_modules not found in $INSTALL_DIR (required for native mode)" >&2
    return 1
  fi

  export LIBVA_DRIVER_NAME="${LIBVA_DRIVER_NAME:-v4l2request}"
  echo "Starting CarPlay native mode (GStreamer)..."
  cd "$INSTALL_DIR"
  exec node "$native_bin" "$@"
}

try_electron_mode() {
  local app_image
  app_image="$(find_appimage)"
  if [[ -z "$app_image" ]]; then
    app_image="$(find_appimage_fallback)"
  fi

  if [[ -z "$app_image" ]]; then
    echo "CarPlay AppImage not found in $INSTALL_DIR" >&2
    echo "Build with: npm run build:cm5" >&2
    return 1
  fi

  export ELECTRON_OZONE_PLATFORM_HINT="${ELECTRON_OZONE_PLATFORM_HINT:-auto}"
  export LIBVA_DRIVER_NAME="${LIBVA_DRIVER_NAME:-v4l2request}"
  export MESA_GL_VERSION_OVERRIDE="${MESA_GL_VERSION_OVERRIDE:-3.1}"

  echo "Starting CarPlay Electron mode..."
  gpu_args=()
  if [[ "${CARPLAY_HARDWARE_GPU:-}" == "1" ]]; then
    gpu_args+=(--use-gl=egl --enable-features=VaapiVideoDecoder,V4L2FlatStatelessVideoDecoder)
  fi
  if [[ "${CARPLAY_SOFTWARE_RENDER:-}" == "1" ]]; then
    gpu_args+=(--disable-gpu --disable-gpu-compositing)
  fi
  exec "$app_image" "${gpu_args[@]}" "$@"
}

if try_native_mode; then
  exit 0
fi

try_electron_mode
