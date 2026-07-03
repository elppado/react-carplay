#!/usr/bin/env bash
set -euo pipefail

USER_NAME="${SUDO_USER:-$USER}"
HOME_DIR="$(eval echo "~$USER_NAME")"
INSTALL_DIR="${INSTALL_DIR:-$HOME_DIR/carplay}"
APP_NAME="react-carplay"
UDEV_RULE=/etc/udev/rules.d/52-carplay-carlinkit.rules

echo "==> Raspberry Pi CM5 CarPlay setup"
echo "    user: $USER_NAME"
echo "    install dir: $INSTALL_DIR"

sudo apt-get update
sudo apt-get install -y fuse libfuse2 udev

echo "==> Creating udev rule for Carlinkit dongle (4884:1520)"
echo 'SUBSYSTEM=="usb", ATTR{idVendor}=="1314", ATTR{idProduct}=="152*", MODE="0666", GROUP="plugdev"' | sudo tee "$UDEV_RULE"
sudo udevadm control --reload-rules
sudo udevadm trigger

sudo usermod -aG plugdev "$USER_NAME" || true

mkdir -p "$INSTALL_DIR"
chmod +x "$INSTALL_DIR"/*.AppImage 2>/dev/null || true

AUTOSTART_DIR="$HOME_DIR/.config/autostart"
mkdir -p "$AUTOSTART_DIR"

cat >"$AUTOSTART_DIR/carplay.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=CarPlay
Comment=CarPlay for Raspberry Pi CM5
Exec=$INSTALL_DIR/launch-carplay.sh
Terminal=false
X-GNOME-Autostart-enabled=true
EOF

chmod +x "$AUTOSTART_DIR/carplay.desktop"

if [[ -f "$INSTALL_DIR/scripts/launch-pi.sh" ]]; then
  cp "$INSTALL_DIR/scripts/launch-pi.sh" "$INSTALL_DIR/launch-carplay.sh"
  chmod +x "$INSTALL_DIR/launch-carplay.sh"
fi

echo "==> Done."
echo "Copy the CM5 AppImage to $INSTALL_DIR and reboot, or run:"
echo "  $INSTALL_DIR/launch-carplay.sh"
