#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_IMAGE="$(find "$SCRIPT_DIR/.." -maxdepth 1 -name 'react-carplay-*-cm5-arm64.AppImage' -type f | head -n 1)"

if [[ -z "$APP_IMAGE" ]]; then
  APP_IMAGE="$(find "$SCRIPT_DIR/.." -maxdepth 1 -name 'react-carplay-*-arm64.AppImage' -type f | head -n 1)"
fi

if [[ -z "$APP_IMAGE" ]]; then
  echo "CarPlay AppImage not found. Build with: npm run build:cm5" >&2
  exit 1
fi

export ELECTRON_OZONE_PLATFORM_HINT="${ELECTRON_OZONE_PLATFORM_HINT:-auto}"
export LIBVA_DRIVER_NAME="${LIBVA_DRIVER_NAME:-v4l2request}"
export MESA_GL_VERSION_OVERRIDE="${MESA_GL_VERSION_OVERRIDE:-3.1}"

exec "$APP_IMAGE" \
  --use-gl=egl \
  --enable-features=VaapiVideoDecoder,V4L2FlatStatelessVideoDecoder \
  "$@"
