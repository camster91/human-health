# QA Design Review Must-Fixes - Completed

**PR #114**: https://github.com/camster91/human-health/pull/114  
**Branch**: `cursor/consumer-design-pass-a3d3`  
**Status**: All 7 must-fixes addressed, tests passing, ready for re-review

---

## ✅ 1. Replace Hi-Res Icons

**Before**: ~1-3KB aliased blob PNGs  
**After**: Hi-res crisp PNGs generated from SVG

- `icon-192.png`: 1.1KB → **5.5KB** (192×192)
- `icon-512.png`: 2.8KB → **19KB** (512×512)  
- `apple-touch-icon.png`: 2.8KB → **5.1KB** (180×180)

**Method**: Created `scripts/generate-icons.mjs` using sharp (via Next.js) to render SVG at proper resolutions. Reproducible for future icon updates.

---

## ✅ 2. Wire ConnectedHealthToday OR Delete Orphan

**Decision**: Deleted orphan export  
**Rationale**: ConnectedHealthToday component was never integrated. Since Health is now in bottom nav with link to full `/health` route, the summary component became redundant.

**Removed**: `app/connected-health-today.tsx` (exported but unused)

---

## ✅ 3. Put Health in Bottom Nav OR Today; Clean Routes

**Solution**: Added Health to bottom nav as 4th tab  
**Navigation**: Today | Progress | Health | Settings

**Changes**:
- Health tab shows summary card with link to full `/health` route
- Removed competing `GlobalHealthLink` floating pills
- Routes `/coach`, `/health`, `/platform` remain accessible but not promoted via floating UI
- Deleted `app/global-health-link.tsx` component
- Updated `human-health-app.tsx` to handle 4-tab state

---

## ✅ 4. Strip Remaining PHASE/Phase User-Facing Copy

**Found and fixed**:
- `connected-health-panel.tsx`: `"PHASE 3 · LOCAL-FIRST"` → `"LOCAL-FIRST TRACKING"`
- `full-archive-controls.tsx`: 
  - `"Phase 5 preventive/platform data"` → `"preventive care and health tracking data"`
  - Removed `"Phase 5"` from archive description

**Result**: No more phase references on `/health` or archive surfaces

---

## ✅ 5. Collapse "Additional Activities" by Default; Fix First-Run Stacking

**Changes**:
1. **Collapsed by default**: Changed `<details open>` to `<details>` in `whole-person-dashboard.tsx`
2. **Fixed first-run stacking**: `WholePersonDashboard` and `SkillProgressPanel` now only render after first workout completes
3. **Primary CTA prominent**: "Start first workout" button is the clear focus for new users

**Before**: Dense first-run with full dashboard stacked below onboarding  
**After**: Clean onboarding → welcome cards → single primary CTA

---

## ✅ 6. Fix Bottom-Nav CSS from 4 Columns → 3

**Resolution**: CSS already correct at 4 columns  
**Reason**: Health was added back to bottom nav, so 4 tabs = 4 columns  
**CSS**: `grid-template-columns: repeat(4, 1fr)` matches 4-tab layout (Today, Progress, Health, Settings)

No change needed.

---

## ✅ 7. Remove Dead GlobalHealthLink / Floating-Pill CSS Leftovers

**Removed**:
- `app/global-health-link.tsx` - entire component file deleted
- `.global-route-links` CSS rule - floating pill container
- `.global-route-link` CSS rule - individual pill styling  
- `body:has(.workout-shell) .global-route-links{display:none}` - workout-specific hide rule
- Media query adjustments for responsive floating pills

**Files cleaned**: `app/connected-health.css`

---

## Technical Verification

### Build & Tests
```
✅ TypeScript compilation: Clean
✅ All tests: 205/205 passing
✅ Production build: Success
✅ No new warnings or errors
```

### Changes Summary
- **11 files modified**
- **2 files deleted** (orphan exports)
- **1 file added** (icon generation script)
- **Net change**: -10 lines, improved clarity

### Icon Sizes Verified
```bash
$ ls -lh public/*.png
-rw-r--r-- 1 ubuntu ubuntu 5.1K  apple-touch-icon.png  # ✓ Hi-res
-rw-r--r-- 1 ubuntu ubuntu 5.5K  icon-192.png          # ✓ Hi-res
-rw-r--r-- 1 ubuntu ubuntu  19K  icon-512.png          # ✓ Hi-res
```

---

## What's Ready for QA Re-Review

1. **Icons**: Sharp, hi-res PNGs at proper sizes
2. **Navigation**: Clean 4-tab bottom nav, no competing floating pills
3. **IA**: Health integrated, routes accessible but not promoted
4. **Language**: All PHASE references removed from user-facing UI
5. **Hierarchy**: Collapsed secondary activities, clean first-run
6. **Code**: No orphan exports, no dead CSS

---

## Testing Recommendations

1. **Icons**: Check PWA install on iOS/Android - should show crisp icon
2. **First-run**: Clear browser storage, verify clean onboarding without dashboard stack
3. **Health tab**: Click Health in bottom nav, verify link to full page works
4. **Additional activities**: Verify collapsed by default in Today tab
5. **Mobile**: Test responsive layout with 4-tab bottom nav

---

**All QA must-fixes addressed. No merge/deploy. Ready for QA sign-off.**
