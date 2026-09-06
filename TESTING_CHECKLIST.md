# Native Mobile App UX — Testing Checklist

## Pre-Deployment Verification
- [x] `npm run verify` passes
- [x] All tests pass (205 tests)
- [x] TypeScript compilation succeeds
- [x] Production build completes
- [x] PWA checks pass

## Visual Inspection (iPhone)

### General Layout
- [ ] App max-width is ~430px on phone
- [ ] Content is full-bleed edge-to-edge
- [ ] No horizontal scroll
- [ ] Safe area insets respected (notch/dynamic island)
- [ ] Bottom safe area respected (home indicator)

### Tab Bar
- [ ] Tab bar is edge-to-edge (no rounded pill)
- [ ] Tab bar has 4 items: Today, Progress, Health, Settings
- [ ] Each tab has icon above label
- [ ] Active tab has accent color (#c84712)
- [ ] Inactive tabs are muted gray
- [ ] Tab bar sits flush at bottom
- [ ] Tab bar respects home indicator space
- [ ] Tabs are easy to tap with thumb

### Typography
- [ ] Text renders in system font (San Francisco on iOS)
- [ ] Headlines are appropriately sized (not too large)
- [ ] Body text is readable but compact
- [ ] No obvious font loading flash
- [ ] Weights look correct (600/650 for bold elements)

### Touch Targets
- [ ] Primary buttons are easy to tap (52px+)
- [ ] "Complete workout" button is notably larger
- [ ] Input fields are comfortable to tap (50px)
- [ ] Select dropdowns work well
- [ ] Small buttons (links) are still tappable

### Spacing & Density
- [ ] Cards feel compact but not cramped
- [ ] Margins between cards are tight (16px)
- [ ] Internal card padding feels right (20px)
- [ ] List items are easy to scan
- [ ] No excessive whitespace

### Shadows & Depth
- [ ] Card shadows are subtle (not heavy)
- [ ] Rest timer has clear depth
- [ ] Tab bar has slight elevation
- [ ] Overall feel is flat/modern (not skeuomorphic)

## Functional Testing

### Navigation
- [ ] Tap each tab → correct content loads
- [ ] Tab active state updates correctly
- [ ] Navigation is instant (no lag)
- [ ] Back button in sub-pages works

### Today Tab
- [ ] First-run hero displays correctly
- [ ] "Start your first workout" button works
- [ ] Workout recommendation card displays
- [ ] Quick actions (20min, 30min, etc.) work
- [ ] Gym selector in header works

### Active Workout
- [ ] Workout starts correctly
- [ ] Exercise cards display properly
- [ ] Set logging works (weight, reps, RIR)
- [ ] "Log working set" button works
- [ ] Checkbox states update
- [ ] Swap exercise panel opens/closes
- [ ] Add exercise panel opens/closes
- [ ] Pause/Resume works
- [ ] Complete workout works
- [ ] Abandon workout confirmation works

### Rest Timer
- [ ] Timer starts after logging a set
- [ ] Timer displays clearly above tab bar
- [ ] Tab bar dims when timer is active
- [ ] Timer countdown updates every second
- [ ] Pause/Resume timer works
- [ ] +30s button works
- [ ] Restart button works
- [ ] Skip button works
- [ ] Notification/vibration fires when timer ends (if enabled)

### Progress Tab
- [ ] History list displays
- [ ] History items are scannable
- [ ] Trend panels load
- [ ] Assessment panel opens/closes

### Health Tab
- [ ] Health card displays
- [ ] Link to /health page works

### Settings Tab
- [ ] All settings sections visible
- [ ] Gym selector works
- [ ] Life mode selector works
- [ ] Toggles work (notifications, vibration, etc.)
- [ ] Equipment chips toggle correctly
- [ ] Domain priority selects work
- [ ] Export data button works
- [ ] Delete data confirmation works
- [ ] Privacy link works

### Form Controls
- [ ] Text inputs focus correctly
- [ ] Number inputs show numeric keyboard
- [ ] Select dropdowns show custom arrow
- [ ] Select options display correctly
- [ ] Checkboxes check/uncheck
- [ ] Checkbox visual state is clear

## Edge Cases

### Orientation
- [ ] Portrait mode: optimal layout
- [ ] Landscape mode: still usable (if supported)

### Long Content
- [ ] Scroll works smoothly
- [ ] Tab bar stays fixed at bottom
- [ ] Rest timer stays fixed above tab bar
- [ ] No content hidden behind tab bar

### Small Screens (iPhone SE)
- [ ] Content fits without overflow
- [ ] Touch targets still comfortable
- [ ] Typography scales appropriately

### Large Screens (iPhone Pro Max)
- [ ] Content stays 430px max-width
- [ ] Centered properly
- [ ] No awkward stretching

### Very Large Screens (iPad, Desktop)
- [ ] App appears as phone-sized column
- [ ] Centered on screen
- [ ] Still functional
- [ ] Tab bar visible and clickable

### PWA Standalone Mode
- [ ] Add to Home Screen works
- [ ] App launches in standalone mode
- [ ] No browser chrome visible
- [ ] Status bar color matches app
- [ ] Safe areas work correctly

## Visual Inspection (Android)

### General
- [ ] App looks native on Android
- [ ] System font renders correctly (Roboto)
- [ ] Navigation bar respected (3-button/gesture)
- [ ] Safe areas work

### Tab Bar
- [ ] Tab bar sits above navigation bar
- [ ] Tab bar respects gesture nav area
- [ ] Touch targets work well

### Everything Else
- [ ] Repeat iPhone functional tests
- [ ] Verify Android-specific behaviors

## Performance

### Load Time
- [ ] Initial load is fast (no font flash)
- [ ] Navigation between tabs is instant
- [ ] Workout start is fast
- [ ] Set logging is responsive

### Interaction
- [ ] Button taps feel instant
- [ ] No lag when scrolling
- [ ] Smooth animations (if any)
- [ ] Rest timer updates smoothly

### Data
- [ ] Workouts save correctly
- [ ] History persists
- [ ] Settings persist
- [ ] No data loss after refresh

## Accessibility

### Basic
- [ ] Text is readable
- [ ] Contrast is sufficient
- [ ] Touch targets meet minimum size
- [ ] Focus states visible

### Screen Reader (VoiceOver/TalkBack)
- [ ] Tab labels announced correctly
- [ ] Button labels announced
- [ ] Form labels associated
- [ ] Status updates announced

## Regression Checks

### Critical Flows
- [ ] Complete workout flow works end-to-end
- [ ] Settings save and apply correctly
- [ ] History remains accurate
- [ ] Export data includes everything
- [ ] Import data still works (if tested)

### Edge Cases
- [ ] Workout with pain flag still works
- [ ] Workout with deferred exercises works
- [ ] Swap exercise mid-workout works
- [ ] Add optional exercise works
- [ ] End early vs complete logic correct

## Browser Compatibility

### iOS Safari
- [ ] Everything works
- [ ] PWA install works
- [ ] Standalone mode works

### Chrome (iOS)
- [ ] Everything works
- [ ] Note: PWA install may differ

### Chrome (Android)
- [ ] Everything works
- [ ] PWA install works
- [ ] Standalone mode works

### Firefox (Android)
- [ ] Everything works
- [ ] Note: PWA support may vary

## Comparison to Main Branch

### Side-by-Side
- [ ] Open main branch on one device
- [ ] Open PR branch on another device
- [ ] Compare visual feel
- [ ] Confirm new version feels more "app-like"
- [ ] Verify no functionality lost

### Screenshot Comparison
- [ ] Take same screen on both versions
- [ ] Note improvements:
  - Tab bar style
  - Touch target sizes
  - Typography scale
  - Spacing/density
  - Shadow depth
  - Overall native feel

## Sign-Off

### Developer
- [ ] All code changes reviewed
- [ ] No logic bugs introduced
- [ ] Performance acceptable
- [ ] Ready for user testing

### Designer (if applicable)
- [ ] Visual language matches brief
- [ ] Native app feel achieved
- [ ] Brand consistency maintained
- [ ] Touch ergonomics sound

### Product Owner
- [ ] Addresses user feedback
- [ ] No scope creep
- [ ] Functionality preserved
- [ ] Ready for staging deploy

### User (Cameron)
- [ ] "This looks like an app now" ✓
- [ ] Ready for production deploy

---

## Notes Section

### Issues Found
(Document any issues discovered during testing)

### Improvements Needed
(Document any follow-up work identified)

### Positive Observations
(Document what works particularly well)

---

**Last Updated**: Before deployment  
**Testing Environment**: [Device/Browser info]  
**Tester**: [Name]  
**Date**: [YYYY-MM-DD]
