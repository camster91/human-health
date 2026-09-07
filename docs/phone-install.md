# Phone Installation Guide

Human Health can run as a native Android app or as a Progressive Web App (PWA) on both Android and iOS devices.

## Android (Native APK)

### Quick Install

1. **Download the APK**
   - Go to the [GitHub Actions page](https://github.com/camster91/human-health/actions/workflows/android-apk.yml)
   - Click on the latest successful workflow run
   - Scroll to "Artifacts" at the bottom
   - Download `human-health-debug-apk`
   - Extract the ZIP file to get `app-debug.apk`

2. **Install the APK**
   - Transfer the APK to your Android device
   - Open the APK file on your device
   - If prompted, enable "Install from Unknown Sources" for your file manager or browser
   - Tap "Install" to complete the installation

3. **Open the App**
   - Find "Human Health" in your app drawer
   - Package ID: `com.ashbi.humanhealth`

### Build Locally

To build your own APK:

```bash
# Install dependencies
npm ci

# Build the Next.js app
npm run build

# Sync Capacitor
npx cap sync android

# Build debug APK
cd android
./gradlew assembleDebug
```

The APK will be located at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

**Note**: This is a debug APK suitable for personal use. It is not signed for production or Play Store distribution.

## iOS (PWA Only)

Native iOS builds require Xcode on macOS. For now, use the PWA:

1. Open Safari on your iPhone/iPad
2. Navigate to https://health.ashbi.ca
3. Tap the Share button (square with arrow)
4. Scroll down and tap "Add to Home Screen"
5. Tap "Add" to confirm

The app icon will appear on your home screen and behave like a native app.

**Note**: PWA features on iOS include:
- Offline support
- Full-screen mode without browser UI
- Home screen icon and splash screen
- Local data storage

## Web/PWA (All Platforms)

### Desktop or Mobile Browser

1. Visit https://health.ashbi.ca in any modern browser
2. For installable PWA:
   - **Chrome/Edge**: Click the install icon in the address bar
   - **Safari (iOS)**: Use "Add to Home Screen" as described above
   - **Firefox**: Desktop install prompt may appear on first visit

### Requirements

- Modern browser with JavaScript enabled
- Internet connection for first load (app caches for offline use)
- Recommended: Chrome 90+, Safari 14+, Firefox 88+, Edge 90+

## Troubleshooting

### Android APK Install Issues

- **"App not installed"**: Make sure you have enough storage space and Android 7.0+
- **"Unknown sources blocked"**: Enable installation from unknown sources in Settings → Security
- **"Parse error"**: Re-download the APK; it may have been corrupted during transfer

### PWA Issues

- **App not caching**: Check browser storage permissions
- **Updates not appearing**: Clear browser cache and reload
- **Missing features**: Ensure you're using a supported browser version

## Development Notes

- **Android Studio**: Open the `android/` directory to modify native Android code
- **Capacitor**: See [capacitor.config.ts](../capacitor.config.ts) for configuration
- **Updates**: The PWA auto-updates on reload; APK requires manual reinstallation

For issues or questions, visit the [GitHub repository](https://github.com/camster91/human-health).
