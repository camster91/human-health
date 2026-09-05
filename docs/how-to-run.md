# How to Run Human Health

Quick start guide for running Human Health locally as a web app and mobile app.

## Prerequisites

- **Node.js** 22.16.0 (see `.nvmrc`)
- **npm** 10.9.2 or later
- **Git** (for version control)

For mobile development, also see [`mobile-setup.md`](./mobile-setup.md) for platform-specific requirements.

## Quick Start (Web)

### 1. Install Dependencies

```bash
npm install
```

### 2. Verify Installation

Run the full verification suite to ensure everything is set up correctly:

```bash
npm run verify
```

This runs:
- TypeScript type checking
- All 205 unit tests
- Production build
- PWA configuration validation

**Expected output:** All checks should pass with no errors.

### 3. Run Development Server

```bash
npm run dev
```

**Access the app:** Open [http://localhost:3000](http://localhost:3000) in your browser.

The dev server includes:
- Fast refresh (changes appear instantly)
- TypeScript error overlay
- React Developer Tools support

**To stop:** Press `Ctrl+C` in the terminal.

### 4. Run Production Build

For a production-like experience:

```bash
npm run build
npm run start
```

**Access the app:** Open [http://localhost:3000](http://localhost:3000) in your browser.

This serves the optimized static build from the `out/` directory.

## Quick Start (Mobile)

### iOS

```bash
# Build and sync assets
npm run cap:ios
```

This will:
1. Build the Next.js static export
2. Sync web assets to the iOS project
3. Open the project in Xcode

**In Xcode:**
- Select a simulator (e.g., iPhone 15)
- Click Run (⌘R)
- The app will launch in the simulator

### Android

```bash
# Build and sync assets
npm run cap:android
```

This will:
1. Build the Next.js static export
2. Sync web assets to the Android project
3. Open the project in Android Studio

**In Android Studio:**
- Wait for Gradle sync to complete
- Select an emulator or device
- Click Run (▶)
- The app will launch

**See [`mobile-setup.md`](./mobile-setup.md) for detailed mobile development instructions.**

## Available Commands

### Development
- `npm run dev` — Start Next.js dev server on port 3000
- `npm run build` — Build production static export to `out/`
- `npm run start` — Serve production build on port 3000

### Quality Checks
- `npm run typecheck` — Run TypeScript type checking (no output = success)
- `npm test` — Run all unit tests (205 tests)
- `npm run check:pwa` — Validate PWA manifest and assets
- `npm run verify` — Run all checks (typecheck + test + build + PWA)

### Mobile (Capacitor)
- `npm run cap:sync` — Build and sync web assets to mobile projects
- `npm run cap:ios` — Sync and open iOS project in Xcode
- `npm run cap:android` — Sync and open Android project in Android Studio

## Using the App

### First Run

When you first open Human Health:

1. **Dashboard** (`/`) shows your training overview
2. **Coach** (`/coach`) provides adaptive training recommendations
3. **Health** (`/health`) displays connected health data (optional)
4. **Platform** (`/platform`) manages long-horizon health tracking (optional)

All data is stored locally in your browser's LocalStorage. No server connection is required.

### Creating Your First Workout

1. Navigate to the **Coach** tab
2. View the recommended session (e.g., "Upper A")
3. Click "Start Session" (if implemented) or navigate to the workout view
4. Log your exercises, sets, reps, and loads
5. Complete the session
6. Your history and next recommendation will update automatically

### Importing Connected Health Data

1. Navigate to the **Health** tab
2. Click "Import" (if implemented) or use the file input
3. Select your Apple Health export XML file
4. Data will be processed locally (no upload)
5. Summaries and trends will appear

### Data Management

- **Export:** Download a full backup of your local data
- **Import:** Restore from a previous export
- **Delete All:** Privacy-directed complete deletion (use with caution)

All operations are local-first. No data leaves your device.

## Browser Compatibility

Recommended browsers:
- **Chrome/Edge** 120+ (best PWA support)
- **Safari** 17+ (iOS/macOS)
- **Firefox** 121+

The app works best in modern browsers that support:
- LocalStorage
- Service Workers (for offline support)
- Web App Manifest (for installability)

## PWA Installation

### Desktop (Chrome/Edge)
1. Open [http://localhost:3000](http://localhost:3000)
2. Look for the install icon in the address bar
3. Click "Install Human Health"
4. The app will open in a standalone window

### Mobile (Safari)
1. Open [http://localhost:3000](http://localhost:3000)
2. Tap the Share button
3. Select "Add to Home Screen"
4. Tap "Add"
5. The app icon appears on your home screen

**Installed PWAs:**
- Work offline after first load
- Launch in standalone mode (no browser chrome)
- Persist data between sessions

## Offline Support

After the first load, Human Health works completely offline:
- All pages and assets are cached by the service worker
- Data is stored locally in LocalStorage
- No network connection is required for core functionality
- An offline indicator appears when disconnected

## Troubleshooting

### Dev server won't start
- **Check port 3000:** Ensure nothing else is using port 3000
  ```bash
  lsof -i :3000
  ```
- **Clear Next.js cache:**
  ```bash
  rm -rf .next
  npm run dev
  ```

### Build fails
- **Clear output directory:**
  ```bash
  rm -rf out .next
  npm run build
  ```
- **Check TypeScript errors:**
  ```bash
  npm run typecheck
  ```

### Tests fail
- **Check Node/npm versions:**
  ```bash
  node --version  # Should be 22.16.0
  npm --version   # Should be 10.9.2+
  ```
- **Reinstall dependencies:**
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  npm test
  ```

### PWA not installing
- **Check HTTPS:** PWAs require HTTPS (localhost is an exception)
- **Check manifest:** Ensure `manifest.webmanifest` is accessible
- **Clear service worker:**
  - Chrome: DevTools → Application → Service Workers → Unregister
  - Safari: Settings → Safari → Advanced → Website Data → Remove

### Data not persisting
- **Check LocalStorage:** DevTools → Application → Local Storage
- **Check browser privacy mode:** Private/incognito mode may block storage
- **Check storage quota:** Ensure you haven't exceeded browser limits

### Mobile build fails
- **iOS:** See [`mobile-setup.md`](./mobile-setup.md#troubleshooting)
- **Android:** See [`mobile-setup.md`](./mobile-setup.md#troubleshooting)

## Development Workflow

### Making Changes

1. **Edit source files** in `app/` or `lib/`
2. **See changes live** (dev server auto-refreshes)
3. **Run tests:**
   ```bash
   npm test
   ```
4. **Check types:**
   ```bash
   npm run typecheck
   ```
5. **Build and verify:**
   ```bash
   npm run verify
   ```

### Before Committing

Always run the verification suite:

```bash
npm run verify
```

This ensures:
- TypeScript compiles cleanly
- All tests pass
- Production build succeeds
- PWA configuration is valid

### Updating Mobile Apps

After making changes to the web app:

```bash
# Rebuild and sync to mobile
npm run cap:sync

# Then rerun the app in Xcode/Android Studio
```

## Next Steps

- **See [`qa-checklist.md`](./qa-checklist.md)** for comprehensive testing instructions
- **See [`mobile-setup.md`](./mobile-setup.md)** for detailed mobile development setup
- **See [`README.md`](../README.md)** for project overview and architecture
- **See [`docs/README.md`](./README.md)** for complete documentation index

## Notes

- **No production deployment exists yet:** `human-health.ashbi.ca` is not currently live
- **No App Store submission:** iOS and Android apps are for local development only
- **Production deployment requires explicit approval** per project requirements
- **This is a fitness/lifestyle product, not a medical device:** See safety boundaries in main README
