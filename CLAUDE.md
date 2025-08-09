# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LeafAngler is a React TypeScript application that measures leaf angles using device motion sensors. It's built as a progressive web app and iOS native app using Capacitor, allowing botanical researchers to track pitch, roll, yaw, and GPS coordinates of leaf orientations.

## Key Commands

### Development
- `npm start` - Start development server at localhost:3000
- `npm test` - Run tests in interactive watch mode
- `npm run build` - Build production bundle to `build/` directory

### iOS Development
- `npm run ios:build` - Build React app and sync with iOS project
- `npm run ios:open` - Open project in Xcode
- `npx cap sync ios` - Sync web assets to iOS after changes

### Deployment
- `npm run deploy` - Build and deploy to GitHub Pages (leafangler.app)

### Testing
- Run individual test: `npm test -- --testNamePattern="test name"`
- Coverage report: `npm test -- --coverage`

## Architecture

### Core Service Layer
The app uses a sensor service pattern to abstract device APIs:

- **SensorService** (`src/services/sensorService.ts`): Manages device orientation, motion, and GPS sensors. Handles iOS permission requests, calculates leaf orientations from device angles, and provides subscription-based updates.

### State Management
The app uses React hooks for state management with localStorage persistence:

- Recording state persisted in `leafangler-recordings`
- Saved datasets in `leafangler-datasets`
- User preferences (theme, last tag) preserved across sessions

### Data Flow
1. SensorService captures device orientation/motion events
2. Calculates surface normal vectors and leaf orientation (zenith/azimuth)
3. React component subscribes to sensor updates
4. User records measurements with optional tags
5. Data can be saved as named datasets and exported as CSV

### iOS Integration
Uses Capacitor for native functionality:

- Device orientation/motion permissions handled via native APIs
- File system access for data persistence
- Native share sheet for CSV export
- Web Share API fallback for web version

### Key Calculations
- **Surface Normal**: Computed from Euler angles using rotation matrices
- **Leaf Zenith**: Angle from vertical (0° = horizontal leaf)
- **Leaf Azimuth**: Compass direction (0° = North)
- **Position Tracking**: Accelerometer integration with drift compensation (experimental)

## Component Structure

Single-page application with three views managed by state:
- **Measure View**: Real-time sensor display and recording
- **Saved View**: Dataset management and export
- **Settings View**: Theme toggle and data management

Custom modal system for user interactions instead of native dialogs.

## Styling

- Tailwind CSS for utility classes
- Dark/light theme support
- Responsive design optimized for mobile
- Material Symbols for icons
- Custom green brand colors matching botanical theme

## Testing Approach

Uses Jest and React Testing Library:
- Unit tests for sensor calculations
- Component testing with mocked sensor data
- Coverage reports in `coverage/` directory

## Deployment

- GitHub Pages hosting at leafangler.app
- iOS app distributed via App Store
- Build outputs to `build/` for web, synced to `ios/App/App/public/` for native