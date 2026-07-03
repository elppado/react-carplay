#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Native mode (node-carplay + GStreamer) — default on Pi when available
if [[ "${CARPLAY_ELECTRON:-}" != "1" ]] && command -v gst-launch-1.0 >/dev/null && command -v aplay >/dev/null; then
  NATIVE_BIN="$ROOT_DIR/out/main/native.js"
  if [[ -f "$NATIVE_BIN" ]]; then
    export LIBVA_DRIVER_NAME="${LIBVA_DRIVER_NAME:-v4l2request}"
    echo "Starting CarPlay native mode (GStreamer)..."
    exec node "$NATIVE_BIN" "$@"
  fi
  echo "Native binary not found at $NATIVE_BIN — build with: npm run build" >&2
  if [[ "${CARPLAY_FALLBACK_ELECTRON:-}" != "1" ]]; then
    exit 1
  fi
fi

APP_IMAGE="$(find "$ROOT_DIR" -maxdepth 1 -name 'react-carplay-*-cm5-arm64.AppImage' -type f | head -n 1)"

if [[ -z "$APP_IMAGE" ]]; then
  APP_IMAGE="$(find "$ROOT_DIR" -maxdepth 1 -name 'react-carplay-*-arm64.AppImage' -type f | head -n 1)"
fi

if [[ -z "$APP_IMAGE" ]]; then
  echo "CarPlay AppImage not found. Build with: npm run build:cm5" >&2
  echo "Or use native mode: npm run build && npm run start:native" >&2
  exit 1
fi

export ELECTRON_OZONE_PLATFORM_HINT="${ELECTRON_OZONE_PLATFORM_HINT:-auto}"
export LIBVA_DRIVER_NAME="${LIBVA_DRIVER_NAME:-v4l2request}"
export MESA_GL_VERSION_OVERRIDE="${MESA_GL_VERSION_OVERRIDE:-3.1}"

echo "Starting CarPlay Electron mode..."
exec "$APP_IMAGE" \
  --use-gl=egl \
  --enable-features=VaapiVideoDecoder,V4L2FlatStatelessVideoDecoder \
  "$@"
