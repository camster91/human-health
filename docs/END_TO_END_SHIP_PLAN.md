# End-to-End Ship Plan — Human Health to ~100%

**Product bar:** Apple Fitness+ / Hevy density, adult terse coach, no fake metrics, local-first, world-class not hobby  
**Live URL:** https://health.ashbi.ca  
**Verification gate:** VPS verify, not GitHub Actions  
**Last updated:** 2026-09-09

---

## 1. Vision / Paid Offer One-Liner

**Human Health: Your adaptive lifetime fitness coach — structured goals, flexible execution, privacy-first.**

### Paid tier positioning
*Personal Health Pro* — $9.99/month or $79.99/year:
- Unlimited workout history retention
- Advanced coaching intelligence with trend detection
- Connected health integrations (Apple Health, Health Connect)
- Clinician export summaries
- Personal baseline tracking
- Priority feature access

Free tier: 90-day history, core adaptive workouts, local-only data.

---

## 2. Current Completion % by Area

### Today / Session / Log (70%)
**Complete:**
- ✅ Today view with recommended next action
- ✅ Live workout logging with rest timer and wake-lock
- ✅ Exercise substitutions and equipment adaptation
- ✅ Readiness check-ins (ready/flat/sore/peak)
- ✅ Plate calculator
- ✅ Progression rules and PR tracking
- ✅ Post-workout summary
- ✅ Workout history and previous performance comparison

**Missing:**
- ⚠️ Short-on-time adaptive reduction UI (logic exists, needs UI polish)
- ⚠️ Low-energy workout preview in Today view
- ⚠️ End-early session handling with partial completion credit
- ❌ Workout pause/resume with interruption tracking
- ❌ Super-set / circuit workout UI patterns
- ❌ Video exercise demonstrations (GIFs exist but not integrated)

### Lift / Training (65%)
**Complete:**
- ✅ Upper/lower split adaptive program
- ✅ Equipment profiles and gym switching
- ✅ Exercise knowledge graph with substitutions
- ✅ Volume scaling based on readiness
- ✅ Progression rules with conservative deload logic
- ✅ Training history with PR badges

**Missing:**
- ❌ Push/pull/legs split option
- ❌ Full-body 3-day option
- ❌ Custom program builder
- ❌ Exercise library browser with filtering
- ❌ Training plan preview (4-week calendar view)
- ❌ Mesocycle/deload week planning UI
- ❌ Body-part split template

### You / Whole-Person Fitness (50%)
**Complete:**
- ✅ Readiness tracking with manual check-ins
- ✅ Recovery-aware volume adjustment
- ✅ Multi-goal Focus/Maintain/Deprioritize preferences
- ✅ Basic capability trend cards (lift/cardio/consistency)

**Missing:**
- ❌ Core programming (planned movements exist, no UI)
- ❌ Mobility/flexibility routines
- ❌ Bodyweight skill trees (pull-ups, push-ups, etc.)
- ❌ Cardio programming with weekly targets
- ❌ Power/balance/athleticism work
- ❌ Capability assessment flows
- ❌ Travel mode / minimum-effective-day plans
- ❌ Return-from-break adaptive restart

### Connected Health (60%)
**Complete (source-reviewed, not runtime-verified):**
- ✅ Health Connect / Apple Health bridge contract
- ✅ Local Apple Health XML import
- ✅ Sleep, steps, heart rate, resting HR, cardio fitness, workouts
- ✅ Source provenance and stale-data handling
- ✅ Source-scoped deletion
- ✅ `/health/` route with permissions, summaries, trends

**Missing:**
- ⚠️ Native HealthKit integration (code complete, needs device testing)
- ⚠️ Native Health Connect integration (code complete, needs device testing)
- ❌ Automated native sync on app launch
- ❌ Nutrition/hydration habit tracking UI (backend exists)
- ❌ Menstrual cycle tracking integration
- ❌ Body composition trends (weight, body fat %)
- ❌ HRV (heart rate variability) tracking
- ❌ Blood pressure tracking
- ❌ Glucose monitoring (requires medical review)

### Assets / Design (75%)
**Complete:**
- ✅ Custom tab bar icons (today/lift/log/you filled+outline)
- ✅ Check-in chip icons (ready/flat/sore/peak)
- ✅ Metric icons (energy/sleep/timer/activity/checkmark/trend-up)
- ✅ Hero illustrations (soft peach gradients)
- ✅ Empty state illustrations (clipboard, bar chart)
- ✅ PWA icon with gradient background
- ✅ Apple touch icon
- ✅ 192/512px PWA icons

**Missing:**
- ❌ Exercise demonstration GIFs/videos integrated
- ❌ Onboarding illustration sequence
- ❌ Achievement/milestone badges
- ❌ Social proof / testimonial assets
- ❌ App Store screenshots (8 required per platform)
- ❌ App Store feature graphic (1024×500)
- ❌ Play Store feature graphic (1024×500)
- ❌ Promo video (30 sec)

### PWA / Native (70%)
**Complete:**
- ✅ Next.js 15 PWA with service worker
- ✅ Offline fallback page
- ✅ Web manifest with proper icons
- ✅ Install prompt
- ✅ Capacitor Android/iOS configured
- ✅ Debug APK build workflow
- ✅ Wake lock during workouts
- ✅ Local-first persistence (localStorage + IndexedDB)

**Missing:**
- ⚠️ Splash screen (uses default)
- ⚠️ iOS notch/safe-area polish
- ❌ Push notifications (workout reminders)
- ❌ Background sync for connected health
- ❌ Share workout summaries (Web Share API)
- ❌ Haptic feedback on PR / milestone
- ❌ Biometric unlock for sensitive health data
- ❌ Widget support (iOS 17+, Android 12+)

### Platform / Long-Horizon (40%)
**Complete (source-complete, not runtime-verified):**
- ✅ Preventive health reminders (user/clinician-entered)
- ✅ Clinician export summaries (Markdown/JSON)
- ✅ Capability-model validation registry
- ✅ Personal baseline tracking (deterministic, on-device)
- ✅ Scoped integration bundle contract
- ✅ Regulatory escalation checkpoints
- ✅ Full archive v2 with Phase 5 data
- ✅ `/platform/` route

**Missing:**
- ⚠️ Runtime verification of all Phase 5 features
- ❌ External validation evidence for capability models
- ❌ Clinician portal / sharing link
- ❌ Integration marketplace (Strava, MyFitnessPal, etc.)
- ❌ Research partnership data donation opt-in
- ❌ HIPAA compliance review (if needed)
- ❌ FDA/medical device review (if needed)

### Monetization (0%)
**Missing:**
- ❌ Stripe integration
- ❌ Subscription management UI
- ❌ Trial period (14 days)
- ❌ Upgrade prompts (non-annoying)
- ❌ Receipt validation
- ❌ Subscription status sync
- ❌ Cancel/pause/reactivate flows
- ❌ Pricing page
- ❌ Testimonials / social proof

---

## 3. Phased Roadmap to ~100%

### P0 — Ship-Critical (Must Complete Before Public Launch)

#### P0.1 — Runtime Verification & Bug Fixes
**Why:** Phase 3/4/5 are source-complete but not runtime-tested  
**Effort:** 2-3 weeks of focused testing + fixes  
**Acceptance:**
- [ ] VPS verify passes: typecheck, test, build, PWA checks
- [ ] `/health/` loads and persists data in browser
- [ ] `/coach/` loads with deterministic recommendations
- [ ] `/platform/` loads with preventive reminders
- [ ] Apple Health XML import completes without errors (test with real export.xml)
- [ ] Full archive export/import/delete works end-to-end
- [ ] Source-scoped delete removes only intended data
- [ ] Offline reload works for all static routes
- [ ] No console errors on mobile Chrome/Safari
- [ ] No data loss on browser refresh
- [ ] Readable error messages for all failure states

#### P0.2 — Native Health Integrations (Android + iOS)
**Why:** Core differentiator, connected-health is half the value  
**Effort:** 1-2 weeks of device testing + permission flows  
**Acceptance:**
- [ ] Android Health Connect sync works on Pixel/Samsung device
- [ ] iOS HealthKit sync works on iPhone
- [ ] Permission request flows are clear and non-scary
- [ ] Sync errors are surfaced gracefully
- [ ] Freshness indicators update correctly
- [ ] No duplicate data on repeated syncs
- [ ] Battery impact is acceptable (<2% per day background)

#### P0.3 — Onboarding & First-Run Experience
**Why:** Current app assumes user knows what to do  
**Effort:** 1 week of design + implementation  
**Acceptance:**
- [ ] Welcome screen explains value prop in 3 screens
- [ ] Goal selection (Strength Focus / Balanced / Cardio Focus)
- [ ] Equipment selection (Full Gym / Home Gym / Minimal)
- [ ] Training experience (Beginner / Intermediate / Advanced)
- [ ] Health permissions opt-in with clear benefits
- [ ] Skip/back navigation works
- [ ] Onboarding can be reset from settings
- [ ] First Today view shows helpful guidance

#### P0.4 — Critical UX Polish
**Why:** App feels like prototype in places  
**Effort:** 1-2 weeks of systematic polish  
**Acceptance:**
- [ ] All loading states show spinners (not blank screens)
- [ ] All error states show actionable messages
- [ ] All empty states show helpful illustrations
- [ ] All buttons have proper disabled states
- [ ] All forms validate on blur and on submit
- [ ] Navigation transitions are smooth (no jank)
- [ ] Keyboard dismisses when appropriate
- [ ] Focus management works for keyboard nav
- [ ] Color contrast passes WCAG AA
- [ ] Touch targets are ≥44px
- [ ] Scrolling is smooth on mid-range Android

#### P0.5 — App Store Assets
**Why:** Cannot submit without required assets  
**Effort:** 1 week of design work (Cameron's input required)  
**Acceptance:**
- [ ] 8 App Store screenshots per platform (iPhone 6.7", iPad 12.9")
- [ ] 8 Play Store screenshots (phone + tablet)
- [ ] Feature graphic for both stores (1024×500)
- [ ] 30-second promo video (optional but recommended)
- [ ] App icon passes platform guidelines
- [ ] Privacy policy URL ready
- [ ] Terms of service URL ready
- [ ] Support email and URL ready

#### P0.6 — Play Store Release Build
**Why:** Debug APK doesn't count as shipped  
**Effort:** 3-5 days of release config + signing  
**Acceptance:**
- [ ] Release build configured in Android Studio
- [ ] Signing key generated and backed up securely
- [ ] ProGuard/R8 enabled and tested
- [ ] APK size optimized (<15MB)
- [ ] Release APK tested on 3 devices
- [ ] Play Console account created
- [ ] App listing created with screenshots
- [ ] Internal testing track works
- [ ] Closed beta track ready
- [ ] Production release submitted

---

### P1 — Strong Launch Readiness (Complete Within 1-2 Months Post-P0)

#### P1.1 — Core Whole-Person Fitness
**Why:** "Whole-person" is claimed but only partially delivered  
**Effort:** 3-4 weeks of feature work  
**Acceptance:**
- [ ] Core programming: 2-3 routines (plank variations, anti-rotation, carry)
- [ ] Mobility/flexibility: 3 routines (hip, shoulder, spine)
- [ ] Bodyweight skills: pull-up/push-up progressions
- [ ] Cardio weekly target UI (e.g., "150 min moderate")
- [ ] Capability assessment flow (initial fitness baseline)
- [ ] Power/balance work: 2 optional add-ons (box jumps, single-leg balance)
- [ ] All whole-person workouts log to history
- [ ] Coach integrates whole-person recommendations

#### P1.2 — Workout UX Improvements
**Why:** Competitors have better session flows  
**Effort:** 2 weeks of focused session polish  
**Acceptance:**
- [ ] Pause/resume workout (bathroom break, phone call)
- [ ] End-early with partial credit
- [ ] Short-on-time UI in Today view (show reduced plan)
- [ ] Super-set UI (pair exercises, shared rest timer)
- [ ] Circuit UI (rotate through 3-5 exercises)
- [ ] Exercise swap during session (equipment taken)
- [ ] Workout notes field (free text, "felt great today")

#### P1.3 — Training Plan Options
**Why:** Upper/lower is great but not for everyone  
**Effort:** 2-3 weeks of program design + implementation  
**Acceptance:**
- [ ] Push/pull/legs 6-day split
- [ ] Full-body 3-day split
- [ ] Program picker in onboarding and settings
- [ ] Smooth program switch (no data loss)
- [ ] Each program has 4-week mesocycle structure
- [ ] Deload week logic per program
- [ ] Exercise library browser (filter by muscle, equipment)

#### P1.4 — Monetization Infrastructure
**Why:** Cannot charge without payment system  
**Effort:** 2 weeks of Stripe integration  
**Acceptance:**
- [ ] Stripe account created and verified
- [ ] Subscription products created (monthly, yearly)
- [ ] Payment sheet integration (web + native)
- [ ] Subscription status API endpoint
- [ ] Upgrade prompts at feature gates (non-annoying)
- [ ] Subscription management UI (cancel, pause, reactivate)
- [ ] Receipt validation (iOS in-app purchase, Play billing)
- [ ] Free tier: 90-day history limit enforced
- [ ] Pro tier: unlimited history, all features unlocked
- [ ] 14-day trial offered on first upgrade prompt

#### P1.5 — Notifications & Engagement
**Why:** Retention depends on habit formation  
**Effort:** 1-2 weeks of notification work  
**Acceptance:**
- [ ] Push permission request (after 3 completed workouts)
- [ ] Workout reminder (customizable time)
- [ ] Rest day reminder ("Recovery is training too")
- [ ] Streak notifications (3, 7, 30, 100 days)
- [ ] PR celebration push
- [ ] Notification settings (per-type on/off)
- [ ] No spammy notifications (max 1 per day)

---

### P2 — Polish & Differentiation (Complete Within 3-6 Months Post-Launch)

#### P2.1 — Exercise Demonstrations
**Why:** Users need to see proper form  
**Effort:** 3-4 weeks (depends on video/GIF sourcing)  
**Acceptance:**
- [ ] 50 core exercises have demo GIFs or videos
- [ ] Demos open in modal with scrubbing
- [ ] Video hosting optimized (CDN or local assets)
- [ ] Auto-play on exercise select (optional setting)
- [ ] All demos pass form-quality review
- [ ] Accessibility: captions or text descriptions

#### P2.2 — Social & Sharing
**Why:** Word-of-mouth is cheapest marketing  
**Effort:** 1-2 weeks of sharing features  
**Acceptance:**
- [ ] Share workout summary (Web Share API)
- [ ] Share image: PR graphic with app branding
- [ ] Share referral code (give friend 1 month free)
- [ ] Leaderboard (optional, friend-only)
- [ ] Privacy: no forced social, no Facebook integration

#### P2.3 — Advanced Connected Health
**Why:** Competitors integrate more sources  
**Effort:** 2-3 weeks per integration  
**Acceptance:**
- [ ] Strava integration (sync runs/rides)
- [ ] MyFitnessPal / Cronometer nutrition sync
- [ ] Body composition trends (weight, body fat %)
- [ ] HRV (heart rate variability) tracking
- [ ] Menstrual cycle phase awareness (optional)
- [ ] Blood pressure tracking
- [ ] All integrations have clear privacy controls

#### P2.4 — Travel & Life Modes
**Why:** Real life disrupts plans — app should handle it  
**Effort:** 2 weeks of mode logic  
**Acceptance:**
- [ ] Travel mode: hotel gym, bodyweight, minimal equipment
- [ ] Return-from-break mode: conservative ramp-up
- [ ] Maintenance mode: 2x per week, hold strength
- [ ] Deload mode: explicit rest week
- [ ] Mode picker in Today view
- [ ] Coach recommendations adapt to active mode

#### P2.5 — Accessibility & Internationalization
**Why:** Expand addressable market, legal compliance  
**Effort:** 2-3 weeks of a11y + i18n work  
**Acceptance:**
- [ ] All UI passes WCAG 2.1 AA
- [ ] Screen reader tested (VoiceOver, TalkBack)
- [ ] Keyboard navigation works end-to-end
- [ ] Reduced motion respected
- [ ] Spanish translation (80%+ of strings)
- [ ] French translation (optional)
- [ ] Metric/imperial unit switching
- [ ] Date/time localization

---

## 4. Competitor Parity Table

| Feature | Human Health | Hevy | Strong | Fitbod | Apple Fitness+ | Caliber |
|---------|--------------|------|--------|--------|----------------|---------|
| **Adaptive training program** | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ |
| **Equipment substitutions** | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ |
| **Readiness-aware volume** | ✅ | ❌ | ❌ | ⚠️ | ❌ | ✅ |
| **Live workout logging** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Rest timer** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Plate calculator** | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| **PR tracking** | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| **Workout history** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Exercise library** | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Custom programs** | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ |
| **Video demos** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Apple Health sync** | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Health Connect sync** | ⚠️ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Cardio programming** | ❌ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ |
| **Bodyweight progressions** | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Mobility/flexibility** | ❌ | ❌ | ❌ | ⚠️ | ✅ | ✅ |
| **Coaching intelligence** | ⚠️ | ❌ | ❌ | ⚠️ | ❌ | ✅ |
| **Plateau detection** | ⚠️ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Multi-goal balancing** | ⚠️ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Local-first / offline** | ✅ | ⚠️ | ⚠️ | ⚠️ | ❌ | ❌ |
| **Privacy-first** | ✅ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ |
| **No fake health score** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Clinician export** | ⚠️ | ❌ | ❌ | ❌ | ❌ | ⚠️ |
| **Long-horizon platform** | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **PWA (no install required)** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Native Android** | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| **Native iOS** | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Price** | Free→$10/mo | Free→$9/mo | Free | Free→$10/mo | $10/mo | $50/mo |

**Legend:**  
✅ Fully implemented  
⚠️ Partially implemented or source-complete but not runtime-verified  
❌ Not implemented

**Key differentiators:**
1. Adaptive training that truly adjusts to equipment, readiness, time, life disruptions
2. Local-first / privacy-first architecture (no cloud account required)
3. No fake universal health score
4. Explainable coaching (deterministic-first, not black-box AI)
5. Long-horizon health platform (not just workouts)

**Parity gaps (must close for "100%"):**
1. Exercise video demos (Hevy/Strong/Fitbod all have this)
2. Full cardio + mobility programming
3. Native iOS app in App Store (currently PWA only)
4. Social features (Hevy/Strong have community)

---

## 5. Store Path — PWA → APK → Play → iOS

### Phase 1: PWA Only (Current)
**Timeline:** Now  
**Distribution:** https://health.ashbi.ca  
**Pros:** No store approval, instant updates, works on all platforms  
**Cons:** No native features, no discoverability, iOS limitations

### Phase 2: Android Debug APK (Current)
**Timeline:** Now (via GitHub Actions)  
**Distribution:** Manual download from Actions artifacts  
**Pros:** Native features, full Android API access  
**Cons:** Not discoverable, requires "install unknown apps"

### Phase 3: Play Store Internal Testing (Next)
**Timeline:** After P0.6 (2-3 weeks)  
**Distribution:** Play Console internal track (up to 100 testers)  
**Pros:** Real store flow, feedback loop  
**Cons:** Still not public

### Phase 4: Play Store Closed Beta (Post-P0)
**Timeline:** After P0 complete (4-6 weeks)  
**Distribution:** Opt-in beta via Play Store link  
**Pros:** Public link, up to 100k testers, automated updates  
**Cons:** "Beta" label, limited marketing

### Phase 5: Play Store Production (Post-P1)
**Timeline:** After P1 complete (2-3 months)  
**Distribution:** Public Play Store listing  
**Pros:** Full discoverability, search, ratings, reviews  
**Cons:** Review process, policy compliance  
**Requirements:**
- All P0 acceptance criteria met
- Privacy policy live and linked
- Terms of service live and linked
- COPPA compliance (no <13 without parental consent)
- Health policy compliance (no medical claims)
- Content rating (ESRB, PEGI)

### Phase 6: iOS App Store (Post-P1, when native iOS ready)
**Timeline:** 3-6 months (requires native iOS build)  
**Distribution:** App Store  
**Pros:** iOS users, discoverability, App Store credibility  
**Cons:** Apple review (stricter), 30% cut, annual $99 fee  
**Requirements:**
- Native iOS app (Capacitor + Xcode)
- Apple Developer account ($99/year)
- TestFlight beta testing
- All iOS HIG compliance
- HealthKit permission strings and justifications
- Privacy nutrition label
- App Review approval (2-7 days)

**Recommendation:** Launch on Play Store first (easier approval, faster iteration), then iOS once design passes Cameron's bar and TestFlight feedback is clean.

---

## 6. Monetization Options

### Option A: Freemium with History Limit (Recommended)
**Free tier:**
- 90-day workout history
- Adaptive workouts (upper/lower)
- Basic progress tracking
- Local data only

**Pro tier ($9.99/mo or $79.99/yr):**
- Unlimited history
- Advanced coaching intelligence
- Connected health integrations
- Preventive health tracking
- Clinician export summaries
- Personal baseline tracking
- Priority support

**Pros:**
- Low barrier to entry (try before buy)
- Clear upgrade value (more features + unlimited history)
- Aligns with Hevy/Strong pricing

**Cons:**
- Requires Stripe integration and subscription management
- Need to enforce free tier limits (90-day pruning)

### Option B: Paid-Only ($9.99/mo)
**All features unlocked:**
- No free tier confusion
- No feature-gate design work
- Simpler codebase

**Pros:**
- Simpler to build and maintain
- Higher quality users (committed)
- No "upgrade nag" UX problems

**Cons:**
- Higher barrier to entry (no try-before-buy)
- Smaller addressable market
- Less viral growth

### Option C: Lifetime Purchase ($99-$199 one-time)
**One-time payment, all features forever**

**Pros:**
- Simple user mental model
- No subscription fatigue
- Strong early revenue

**Cons:**
- No recurring revenue (hard to sustain long-term)
- Pricing pressure (race to bottom)
- Hard to justify ongoing development costs

### Option D: Hybrid (Free + Lifetime + Subscription)
**Free tier:** 90-day history, basic features  
**Lifetime:** $149 one-time, all features forever  
**Pro:** $9.99/mo or $79.99/yr, all features + future updates priority

**Pros:**
- Flexibility for different user preferences
- Lifetime option as marketing tool ("early adopter discount")

**Cons:**
- Complex pricing page
- Risk of cannibalization (why subscribe if lifetime exists?)

**Recommendation:** Start with **Option A (Freemium)** to maximize growth, offer lifetime as a limited-time launch promo ($99 for first 1000 users).

---

## 7. What Needs Cameron

### Critical Path (Blocks Launch)
1. **Apple Developer Account**
   - $99/year enrollment
   - Required for: TestFlight, App Store submission, HealthKit entitlements
   - Action: Enroll at developer.apple.com/enroll
   - Timeline: 1-2 days approval

2. **Play Console Account**
   - $25 one-time registration fee
   - Required for: Play Store submission, in-app billing
   - Action: Create account at play.google.com/console/signup
   - Timeline: 1-2 days approval

3. **Design Taste Sign-Off**
   - App Store screenshots (8 per platform)
   - Feature graphics (1024×500 for both stores)
   - Onboarding illustration sequence
   - Exercise demo sourcing (film custom vs. license existing?)
   - Overall "does this look world-class?" review
   - Timeline: Ongoing, 1-2 review cycles per P0 milestone

4. **Privacy Policy & Terms of Service**
   - Legal text for both documents
   - Hosting location (health.ashbi.ca/privacy, health.ashbi.ca/terms)
   - Timeline: 1 week (can use templates, customize for Human Health)

5. **Stripe Account / Payment Setup**
   - Stripe account creation and verification
   - Subscription product setup
   - Webhook endpoint configuration
   - Receipt validation logic review
   - Timeline: 3-5 days

### Nice-to-Have (Cameron's Domain Expertise)
1. **Product prioritization decisions**
   - Which P1 features to cut if timeline is tight?
   - Which competitor features are table stakes vs. nice-to-have?
   - Should we ship with video demos or defer to P2?

2. **Marketing / positioning review**
   - One-liner, paid tier naming, pricing
   - App Store description (first 3 sentences are critical)
   - Screenshot captions and sequencing

3. **Community / beta tester recruitment**
   - Where to find early users? (Reddit, Discord, X?)
   - How to incentivize feedback? (Lifetime free, swag?)

4. **Risk / scope review**
   - Is Phase 5 "long-horizon platform" overkill for v1?
   - Should we cut clinician export and focus on core fitness?
   - What's the real product-market-fit hypothesis?

---

## Summary: Path to ~100%

**Current state:** 60-70% complete (strong foundation, missing key UX and runtime verification)

**P0 — Ship-Critical (4-6 weeks):**
- Runtime verification (VPS verify passing)
- Native health integrations working on real devices
- Onboarding flow
- Critical UX polish
- App Store assets (Cameron design input required)
- Play Store release build

**P1 — Strong Launch (2-3 months):**
- Core whole-person fitness (cardio, mobility, bodyweight)
- Workout UX improvements (pause, super-sets)
- Training plan options (push/pull/legs, full-body)
- Monetization infrastructure (Stripe, subscriptions)
- Notifications & engagement

**P2 — Polish & Differentiation (3-6 months):**
- Exercise demonstrations (GIFs/videos)
- Social & sharing features
- Advanced connected health (Strava, HRV, body comp)
- Travel & life modes
- Accessibility & internationalization

**Target:** 95-100% parity with Hevy/Strong/Fitbod, while maintaining unique differentiation (local-first, privacy, explainable coaching, long-horizon platform).

**Critical dependencies:**
1. Cameron's Apple Developer + Play Console accounts
2. Cameron's design sign-off on screenshots and assets
3. VPS verify infrastructure (not GitHub Actions)
4. Real device testing (Android + iOS with health integrations)

**Store launch sequence:**
1. Play Store Internal Testing (2-3 weeks)
2. Play Store Closed Beta (4-6 weeks)
3. Play Store Production (2-3 months)
4. iOS App Store (3-6 months, after native iOS polish)

**Monetization:** Freemium model with $9.99/mo or $79.99/yr Pro tier unlocking unlimited history, advanced coaching, connected health, and platform features. Free tier: 90-day history, core workouts.

---

## Next Actions

1. **Cameron:** Enroll in Apple Developer Program and create Play Console account
2. **Cameron:** Review and approve this plan (adjust priorities if needed)
3. **Dev:** Start P0.1 runtime verification (VPS verify setup and test suite)
4. **Dev:** Create P0 GitHub Project board with acceptance criteria as issues
5. **Cameron:** Schedule design review session for app store assets
6. **Cameron:** Draft privacy policy and terms of service (or hire legal reviewer)
7. **Dev:** Create P0 completion dashboard (track % progress toward launch)

---

**Document Owner:** Cameron  
**Last Review:** 2026-09-09  
**Next Review:** After P0 completion (target: 2026-10-15)
