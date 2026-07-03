# React-Carplay

A React-based CarPlay application that utilizes the Carlinkit dongle to provide CarPlay functionality for Raspberry Pi and other Linux-based systems.

## Fork Information

This project is forked from [rhysmorgan134/react-carplay](https://github.com/rhysmorgan134/react-carplay/)

## Features

- Full CarPlay functionality with configurable settings
- Support for high-resolution display (up to 1080p)
- Configurable frame rate (up to 60fps, hardware dependent)
- Keyboard controls for navigation and interaction
- Siri voice assistant integration
- Clean, minimal interface
- Raspberry Pi CM5 / ARM64 Linux optimizations

## Prerequisites

- Node.js 18+
- npm
- Carlinkit dongle
- Linux-based system (Raspberry Pi CM5, Pi 5, Ubuntu, etc.)

## Installation

```bash
git clone https://github.com/elppado/react-carplay.git
cd react-carplay
npm install
```

## Running the Application

### Development Mode

```bash
npm run dev
```

If the window does not appear (GPU driver issues), try software rendering:

```bash
npm run start:software
```

On Raspberry Pi, hardware GPU acceleration is opt-in:

```bash
CARPLAY_HARDWARE_GPU=1 npm start
CARPLAY_KIOSK=1 ~/carplay/launch-carplay.sh
```

### Building for Raspberry Pi CM5 (ARM64)

```bash
npm run build:cm5
```

Output:

```bash
./dist/react-carplay-1.0.2-cm5-arm64.AppImage
```

### Pi CM5 first-time setup

On the CM5 board:

```bash
chmod +x setup-pi.sh
./setup-pi.sh
```

Copy the CM5 AppImage and launcher to `~/carplay`, then run:

```bash
~/carplay/launch-carplay.sh
```

This starts **Electron mode** (AppImage) by default. Both the AppImage and `launch-carplay.sh` must be in the same directory (`~/carplay`).

### Native GStreamer mode (optional, experimental)

Chromium-free path using GStreamer + ALSA. Requires the full build output on the Pi (`out/`, `node_modules/`, `package.json`), not just the AppImage:

```bash
CARPLAY_NATIVE=1 ~/carplay/launch-carplay.sh
```

Or from a dev tree after `npm run build`:

```bash
CARPLAY_NATIVE=1 npm run start:native
```

Force Electron when native prerequisites are present:

```bash
CARPLAY_ELECTRON=1 ~/carplay/launch-carplay.sh
```

Optional systemd autostart (replace `pi` with your username):

```bash
sudo cp systemd/carplay.service /etc/systemd/system/carplay@.service
sudo systemctl enable carplay@pi
sudo systemctl start carplay@pi
```

## Pi CM5 optimizations

When running on ARM64 Linux (Raspberry Pi CM5 / Pi 5):

- Kiosk + fullscreen mode enabled by default
- 30 FPS default for smoother GPU decode on VideoCore VII
- EGL + VA-API / V4L2 hardware H.264 decode
- WebGL high-performance rendering without transparency overhead
- CarPlay worker prewarmed at startup for faster dongle connection

## Keyboard Controls

- Arrow keys: Navigation
- Space: Select
- Backspace: Back
- H: Home
- P: Play
- O: Pause
- M: Next
- N: Previous
- S: Siri
- Z: Enable Night Mode
- X: Disable Night Mode

## License

This project is licensed under the MIT License.
