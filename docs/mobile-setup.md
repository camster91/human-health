# Mobile Setup Guide

Human Health is packaged as a mobile app using Capacitor, which wraps the Next.js PWA in native iOS and Android shells.

## Prerequisites

### iOS Development
- **macOS** with Xcode 15 or later
- **Xcode Command Line Tools**: `xcode-select --install`
- **CocoaPods**: `sudo gem install cocoapods`
- Apple Developer account (for device testing and App Store submission)

### Android Development
- **Android Studio** (latest stable version)
- **Android SDK** (API 33 or later)
- **Java Development Kit (JDK)** 17 or later
- Configured `ANDROID_HOME` environment variable

## Quick Start

### Initial Setup

1. **Build the web app:**
   ```bash
   npm run build
   ```

2. **Sync web assets to mobile:**
   ```bash
   npm run cap:sync
   ```

### iOS Development

1. **Open the iOS project:**
   ```bash
   npm run cap:ios
   ```
   This builds the web app, syncs assets, and opens the project in Xcode.

2. **In Xcode:**
   - Select a simulator or connected device
   - Click the **Run** button (⌘R)
   - The app will build and launch

3. **For device testing:**
   - Connect your iOS device via USB
   - Select it in Xcode's device dropdown
   - Ensure your device is registered in your Apple Developer account
   - Build and run

### Android Development

1. **Open the Android project:**
   ```bash
   npm run cap:android
   ```
   This builds the web app, syncs assets, and opens the project in Android Studio.

2. **In Android Studio:**
   - Wait for Gradle sync to complete
   - Select an emulator or connected device from the device dropdown
   - Click the **Run** button (▶)
   - The app will build and launch

3. **For device testing:**
   - Enable Developer Options on your Android device
   - Enable USB Debugging
   - Connect via USB
   - Select your device in Android Studio
   - Build and run

## Development Workflow

When making changes to the web app:

1. **Make your code changes** in the Next.js app
2. **Rebuild and sync:**
   ```bash
   npm run cap:sync
   ```
3. **Rerun the app** in Xcode or Android Studio (no need to reopen the IDE)

For rapid iteration, you can also:
- Keep `npm run dev` running
- Configure Capacitor to point to your local dev server (see Advanced Configuration)

## Project Structure

```
human-health/
├── ios/              # iOS native project (Xcode)
│   └── App/
│       ├── App.xcodeproj
│       └── App/
│           └── public/  # Synced web assets (generated)
├── android/          # Android native project (Android Studio)
│   └── app/
│       └── src/
│           └── main/
│               └── assets/
│                   └── public/  # Synced web assets (generated)
├── capacitor.config.ts  # Capacitor configuration
└── out/              # Built Next.js static export
```

## Advanced Configuration

### Live Reload (Development)

For faster development, you can point Capacitor to your local dev server:

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Update `capacitor.config.ts` temporarily:**
   ```typescript
   const config: CapacitorConfig = {
     appId: 'com.ashbi.humanhealth',
     appName: 'Human Health',
     webDir: 'out',
     server: {
       url: 'http://localhost:3000',  // Add this for live reload
       cleartext: true
     }
   };
   ```

3. **Sync and rerun the app**

**Important:** Revert this change before building for production or App Store submission.

### Native Permissions

Human Health may request the following native permissions (configured in platform-specific files):

#### iOS (`ios/App/App/Info.plist`)
- **NSHealthShareUsageDescription**: For reading HealthKit data (optional, Phase 3 connected health)
- **NSHealthUpdateUsageDescription**: For writing workout data to HealthKit (optional)

#### Android (`android/app/src/main/AndroidManifest.xml`)
- **ACTIVITY_RECOGNITION**: For reading fitness data (optional, Phase 3 connected health)

These permissions are user-initiated and optional. The app works without granting them.

## Build and Distribution

### iOS App Store

1. **Archive the app** in Xcode:
   - Product → Archive
   - Ensure you're building for "Any iOS Device (arm64)"

2. **Validate and upload:**
   - Use Xcode's Organizer
   - Validate the archive
   - Distribute to App Store Connect

3. **Submit for review** via App Store Connect

### Android Play Store

1. **Generate a signed APK/AAB** in Android Studio:
   - Build → Generate Signed Bundle / APK
   - Follow the wizard to create or use a keystore

2. **Upload to Play Console:**
   - Create a release in the Play Console
   - Upload your AAB file
   - Complete the store listing

3. **Submit for review**

**Note:** Production deployment and App Store submission require explicit approval per project requirements. Do not submit without authorization.

## Troubleshooting

### iOS

- **Xcode build fails:** Ensure CocoaPods dependencies are installed:
  ```bash
  cd ios/App && pod install && cd ../..
  ```

- **"No devices" in Xcode:** Ensure simulators are installed via Xcode → Settings → Platforms

### Android

- **Gradle sync fails:** Check that `ANDROID_HOME` is set and Android SDK is installed

- **Build fails with Java errors:** Ensure you're using JDK 17 or later:
  ```bash
  java -version
  ```

### General

- **App shows blank screen:** Ensure you've run `npm run build` and `npm run cap:sync`

- **Changes not appearing:** After code changes, always:
  ```bash
  npm run cap:sync
  ```

## Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Capacitor iOS Guide](https://capacitorjs.com/docs/ios)
- [Capacitor Android Guide](https://capacitorjs.com/docs/android)
- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
