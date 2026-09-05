# QA Checklist for Human Health

This checklist covers critical user flows and known blockers for local use, preview testing, and future deployment preparation.

## Environment Setup

- [ ] **Dependencies installed:** `npm install` completes without errors
- [ ] **TypeScript passes:** `npm run typecheck` succeeds
- [ ] **Tests pass:** `npm test` reports all 205 tests passing
- [ ] **Build succeeds:** `npm run build` completes successfully
- [ ] **PWA validation passes:** `npm run check:pwa` reports success

## Web App (Local Development)

### Basic Functionality
- [ ] **Dev server starts:** `npm run dev` runs and serves on `http://localhost:3000`
- [ ] **Production server starts:** `npm run start` runs and serves static build on `http://localhost:3000`
- [ ] **App loads:** Opening `http://localhost:3000` displays the Human Health interface
- [ ] **Routing works:** Navigation between `/`, `/coach`, `/health`, `/platform` works correctly
- [ ] **Offline indicator:** When network is disconnected, offline indicator appears

### Core Flows

#### Phase 1-2: Adaptive Training Foundation
- [ ] **Create first workout:** User can start and complete a training session
- [ ] **Exercise logging:** Can log sets, reps, and load for each exercise
- [ ] **Workout history:** Completed workouts appear in history
- [ ] **Rolling schedule:** Next recommended session appears based on completion
- [ ] **Manual overrides:** User can manually change next session
- [ ] **Life mode switching:** Can switch between normal/travel/return/maintenance modes
- [ ] **Readiness input:** Can record readiness and see conservative recommendations

#### Phase 3: Connected Health
- [ ] **Apple Health XML import:** Can import Apple Health export file
- [ ] **Health summaries:** Connected health data displays on `/health` page
- [ ] **Source preferences:** Can select primary source for each metric
- [ ] **Data freshness:** Stale/insufficient data is clearly indicated
- [ ] **Privacy:** Connected data remains local (no server upload)

#### Phase 4: Coaching Intelligence
- [ ] **Coach panel:** `/coach` page displays current recommendations
- [ ] **Goal balancing:** Coach considers multiple fitness goals
- [ ] **Evidence-based actions:** Recommendations include evidence IDs and rationale
- [ ] **Plateau detection:** Long-term progress tracking works
- [ ] **Connected integration:** Coach uses connected health as context (when available)

#### Phase 5: Long-Horizon Platform
- [ ] **Preventive records:** Can add preventive health records on `/platform`
- [ ] **Reminders:** Can create and complete preventive reminders
- [ ] **Clinician export:** Can export discussion summary
- [ ] **Integration sharing:** Can generate integration payload with confirmation
- [ ] **Personal baselines:** Baseline calculations display correctly

### Data Integrity
- [ ] **Local storage persists:** Data survives page refresh
- [ ] **Export works:** Full archive export downloads successfully
- [ ] **Import works:** Can import a previously exported archive
- [ ] **Delete all works:** Privacy-directed complete deletion removes all local data
- [ ] **Corruption handling:** App fails safely with corrupt storage (no data loss)
- [ ] **Archive rollback:** Failed imports restore pre-import state

### PWA Features
- [ ] **Manifest valid:** `manifest.webmanifest` is accessible and valid
- [ ] **Service worker registers:** Check browser DevTools → Application → Service Workers
- [ ] **Icons present:** App icons (192x192, 512x512, apple-touch-icon) load correctly
- [ ] **Offline ready:** After first load, app works offline
- [ ] **Installable:** Browser shows "Install" prompt or add-to-home-screen option

## Mobile (Capacitor)

### iOS
- [ ] **Xcode project opens:** `npm run cap:ios` opens Xcode successfully
- [ ] **App builds:** Xcode build completes without errors
- [ ] **App launches:** App runs on simulator without crashes
- [ ] **Data persists:** Training data survives app restart
- [ ] **Native chrome:** Status bar and safe areas render correctly
- [ ] **Touch interactions:** All tap/swipe interactions work smoothly

### Android
- [ ] **Android Studio opens:** `npm run cap:android` opens Android Studio successfully
- [ ] **Gradle sync succeeds:** Gradle build completes without errors
- [ ] **App launches:** App runs on emulator without crashes
- [ ] **Data persists:** Training data survives app restart
- [ ] **Native chrome:** Status bar and navigation render correctly
- [ ] **Touch interactions:** All tap/swipe interactions work smoothly

### Mobile-Specific Testing
- [ ] **Orientation changes:** App adapts to portrait/landscape correctly
- [ ] **Background/foreground:** Data and state survive backgrounding
- [ ] **Deep linking:** Direct navigation to `/coach`, `/health`, `/platform` works
- [ ] **Asset loading:** All images, icons, and fonts load on first launch

## Known Blockers for Deployment

### Infrastructure
- [ ] **No production domain:** `human-health.ashbi.ca` is not currently deployed
- [ ] **No CI runner:** GitHub Actions require self-hosted runner (Issue #51)
- [ ] **No npm lockfile:** `package-lock.json` is missing; reproducibility tracked in PR #102

### Testing Gaps
- [ ] **No browser QA:** Automated browser-based validation not run
- [ ] **No device QA:** Real iOS/Android device testing not performed
- [ ] **No accessibility audit:** Screen reader and keyboard navigation not verified
- [ ] **No Phase 5 QA:** Connected-health corruption recovery not manually tested

### Draft PRs (Evaluate Before Merge)
- [ ] **PR #102 (Draft):** Training storage integrity — evaluate if blocking local use
- [ ] **PR #97 (Draft):** AI readiness documentation — evaluate if blocking local use

### Security & Compliance
- [ ] **Environment secrets:** No sensitive keys or credentials in code
- [ ] **Regulatory boundaries:** App disclaimers clearly state it's not a medical device
- [ ] **Data privacy:** Local-first architecture verified (no remote data sync)
- [ ] **HealthKit permissions:** iOS entitlements correctly scoped (optional, user-initiated)

## Pre-Deployment Gates (For Future Production)

**Do not proceed with these until explicit approval:**

- [ ] **Automated CI passes** on self-hosted runner
- [ ] **Browser testing** (Chrome, Safari, Firefox, Edge)
- [ ] **Device testing** (iOS 16+, Android 13+)
- [ ] **Accessibility testing** (WCAG 2.1 Level AA)
- [ ] **Performance testing** (Lighthouse score >90)
- [ ] **Security audit** (dependency scan, secrets scan)
- [ ] **App Store assets** (screenshots, descriptions, privacy policy)
- [ ] **Legal review** (terms of service, medical device classification)
- [ ] **Cameron's explicit approval** for production deploy or App Store submission

## Testing Notes

### Browser Storage Corruption Testing
To manually test corruption recovery:
1. Open browser DevTools → Application → Local Storage
2. Corrupt a storage key (e.g., change `human-health:history` to invalid JSON)
3. Reload the app
4. Verify error message appears
5. Verify "Replace" import or "Delete All" works
6. Verify app recovers without data loss

### Mobile Testing Without Devices
- **iOS:** Use Xcode iOS Simulator (included with Xcode)
- **Android:** Use Android Emulator (included with Android Studio)
- Simulators/emulators are sufficient for basic functional testing
- Real devices are required for App Store submission and final validation

### Performance Targets
- **First Contentful Paint:** <1.5s (web)
- **Time to Interactive:** <3s (web)
- **App launch time:** <2s (mobile, warm start)
- **Data export time:** <1s for typical dataset (~100 workouts)

## Success Criteria

**Cameron can use this:** ✅
- Web app runs locally via `npm run dev` or `npm run start`
- Core training flows work end-to-end
- Data persists and exports correctly
- Mobile shells build and run in Xcode/Android Studio

**QA-ready:** ✅ when all checklist items pass

**Deploy-ready:** ⏸️ blocked on infrastructure, testing, and approval
