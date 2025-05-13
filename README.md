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

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Carlinkit dongle
- Linux-based system (Raspberry Pi, Ubuntu, etc.)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/elppado/react-carplay.git
cd react-carplay
```

2. Install dependencies:
```bash
npm install
```

## Running the Application

### Development Mode
```bash
npm start
```

### Building for Production

For ARM Linux (Raspberry Pi):
```bash
npm run build:armLinux
```

After building, run the AppImage:
```bash
./react-carplay-4.0.0-arm64.AppImage
```

## Configuration

The application can be configured through the settings interface. Key configuration options include:

- Display resolution
- Frame rate
- Keyboard bindings
- Audio settings
- USB device permissions

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

## Recent Changes

- Restored keyboard functionality
- Implemented Siri button functionality
- Simplified UI by removing unnecessary tabs
- Customized background and theme
- Optimized performance
- Removed unused features for better efficiency

## License

This project is licensed under the MIT License - see the LICENSE file for details.
