# App Store Submission Guide for LeafAngler

## Pre-Submission Checklist

### ✅ App Configuration
- [x] Bundle ID: `com.leafangler.app`
- [x] Version: 1.0
- [x] Build: 1
- [x] App Icon: 1024x1024 included
- [x] Launch Screen configured
- [x] Privacy descriptions in Info.plist:
  - Location (When In Use)
  - Location (Always and When In Use)
  - Motion sensors

### 🔧 Required Actions Before Submission

#### 1. Build the Production App
```bash
# Clean build
npm run build

# Sync with iOS
npx cap sync ios

# Open in Xcode
npx cap open ios
```

#### 2. Configure Xcode Project
In Xcode:
1. Select the App target
2. Go to "Signing & Capabilities"
3. Ensure:
   - Team is selected (your Apple Developer account)
   - Automatically manage signing is checked
   - Bundle identifier: `com.leafangler.app`

#### 3. Create Archive
1. Select "Any iOS Device (arm64)" as destination
2. Product → Archive
3. Wait for build to complete
4. Organizer window will open automatically

## App Store Connect Setup

### 1. Create New App
1. Log in to [App Store Connect](https://appstoreconnect.apple.com)
2. Click "+" → "New App"
3. Fill in:
   - Platform: iOS
   - Name: LeafAngler
   - Primary Language: English (U.S.)
   - Bundle ID: com.leafangler.app
   - SKU: leafangler-001

### 2. App Information

#### Categories
- Primary: Education
- Secondary: Utilities

#### Age Rating
Complete questionnaire:
- No objectionable content
- No violence, adult content, or gambling
- Infrequent/Mild Medical Information (leaf measurements for research)

### 3. App Store Listing

#### App Name
```
LeafAngler
```

#### Subtitle
```
Measure Leaf Angles for Research
```

#### Description
```
LeafAngler is a specialized tool designed for botanists, ecologists, and agricultural researchers to accurately measure leaf angles in the field. Using your device's built-in motion sensors, LeafAngler provides precise measurements of leaf orientation, including zenith and azimuth angles.

KEY FEATURES:
• Real-time leaf angle measurement using device sensors
• Record zenith angle (tilt from horizontal) and azimuth (compass direction)
• GPS coordinate logging for each measurement
• Tag and organize measurements by specimen or location
• Save multiple datasets for different research projects
• Export data as CSV for analysis in R, Excel, or other tools
• Dark mode for comfortable use in various lighting conditions
• Works offline - no internet connection required

PERFECT FOR:
• Botanical field research
• Canopy structure analysis
• Agricultural studies
• Plant physiology research
• Educational demonstrations
• Ecological surveys

HOW IT WORKS:
Simply place your device against a leaf surface and LeafAngler instantly calculates the leaf's orientation relative to the ground. Record measurements with custom tags, build datasets, and export your data for further analysis.

SCIENTIFIC ACCURACY:
LeafAngler uses device gyroscope and accelerometer data to calculate surface normal vectors and derive leaf orientation angles. All measurements include timestamp and optional GPS coordinates for comprehensive field documentation.

Note: LeafAngler requires access to motion sensors and optionally GPS for coordinate logging. All data is stored locally on your device.
```

#### Keywords
```
leaf angle, botanical research, plant measurement, field research, ecology, canopy, agriculture, zenith angle, scientific tool, data collection
```

#### Support URL
```
https://leafangler.app
```

#### Marketing URL
```
https://leafangler.app
```

### 4. Screenshots (Required)

You'll need screenshots for:
- 6.7" Display (iPhone 15 Pro Max): 1290 × 2796 pixels
- 6.5" Display (iPhone 14 Plus): 1242 × 2688 pixels or 1284 × 2778 pixels
- 5.5" Display (iPhone 8 Plus): 1242 × 2208 pixels

#### Recommended Screenshots:
1. Main measurement screen showing live angles
2. Recording with data table
3. Saved datasets view
4. Dark mode view
5. Export/sharing functionality

### 5. App Preview (Optional but Recommended)
- 15-30 second video
- Show the app in action measuring a leaf
- Demonstrate recording and export features

### 6. Privacy Policy

Create a privacy policy covering:
- Location data usage (stored locally only)
- Motion sensor data usage
- No data collection or transmission to servers
- Local storage only

Host at: https://leafangler.app/privacy

### 7. Version Information

#### What's New in This Version
```
Initial release of LeafAngler - Professional leaf angle measurement for botanical research.

• Measure leaf zenith and azimuth angles
• GPS coordinate logging
• Dataset management and CSV export
• Dark mode support
• Optimized for field research
```

## TestFlight Setup (Recommended)

Before full App Store submission:
1. Upload build to TestFlight
2. Add internal testers (yourself, colleagues)
3. Test on multiple devices
4. Gather feedback for 1-2 weeks

## Final Submission

### In Xcode Organizer:
1. Select your archive
2. Click "Distribute App"
3. Choose "App Store Connect"
4. Upload
5. Wait for processing (usually 10-30 minutes)

### In App Store Connect:
1. Go to your app
2. Add the build to your version
3. Complete all required fields
4. Submit for Review

## Review Guidelines Compliance

Your app should pass review as it:
- ✅ Has legitimate educational/research purpose
- ✅ Properly requests permissions with clear descriptions
- ✅ Doesn't collect personal data
- ✅ No account required
- ✅ Works offline
- ✅ No third-party services or ads

## Expected Timeline
- Processing: 24-48 hours
- Review: 24-72 hours (usually faster)
- Total: 2-5 days typically

## Post-Launch Tasks
1. Monitor crash reports in App Store Connect
2. Respond to user reviews
3. Plan update schedule
4. Consider adding:
   - Apple Watch companion app
   - iPad-optimized interface
   - CloudKit sync for data backup
   - Additional export formats

## Pricing Strategy
Recommended: Free (to maximize adoption in research community)
Alternative: $4.99 for professional tool category

## Common Rejection Reasons to Avoid
- ❌ Incomplete app description → Ensure detailed description
- ❌ Privacy policy missing → Add before submission
- ❌ Crashes on review → Test thoroughly
- ❌ Unclear purpose → Emphasize research use case

## Support & Resources
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)