# LeafAngler Development Memory

## Safe Rollback Point
- **Tag**: `v1.0-web` 
- **Description**: Working web version before iOS/Capacitor integration
- **Date**: 2025-08-09
- **Status**: Fully functional web app with persistent localStorage, 3D Enable button, eco icon

### Features at v1.0-web:
- ✅ Sensor permissions working on iOS/Android
- ✅ Real GPS and IMU sensor access
- ✅ Persistent state (recordings, tags, theme)
- ✅ Apple-style permission UI with eco icon
- ✅ CSV export functionality
- ✅ Dark/light mode toggle
- ✅ Custom domain: leafangler.app
- ✅ LeafAngler logo as favicon

### Rollback Command (if needed):
```bash
git reset --hard v1.0-web
npm install
npm run deploy
```

## Current Task: iOS App with Capacitor
- Adding Capacitor to create iOS app wrapper
- Keep web app functionality intact
- Ensure sensor APIs work in native iOS context

## Notes:
- Web app is live and working at https://leafangler.app
- All commits pushed to GitHub before Capacitor integration
- Safe to experiment - can always rollback