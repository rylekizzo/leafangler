# iOS Setup Instructions

## Prerequisites
- Mac computer with macOS
- Xcode installed from App Store
- Apple Developer Account ($99/year)

## Steps to Complete iOS App Setup

### 1. Install Xcode and CocoaPods
```bash
# Install CocoaPods if not already installed
sudo gem install cocoapods
```

### 2. Install iOS Dependencies
```bash
# In the project directory
cd ios/App
pod install
cd ../..
```

### 3. Open in Xcode
```bash
npx cap open ios
```
This will open the iOS project in Xcode.

### 4. Configure Signing
In Xcode:
1. Select the "App" project in the navigator
2. Go to "Signing & Capabilities" tab
3. Select your development team
4. Ensure bundle identifier matches: `com.leafangler.app`

### 5. Test on Simulator or Device
1. Select iPhone simulator or connected device
2. Click the "Play" button to build and run

### 6. Build for App Store
1. In Xcode: Product → Archive
2. Upload to App Store Connect
3. Submit for review

## Current Status
✅ Capacitor configured
✅ iOS project created
✅ Permissions configured (Location, Motion sensors)
✅ Web assets synced

⏳ Requires Xcode for completion
⏳ Requires Apple Developer Account for deployment