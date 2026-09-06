# Custom Graphics Asset Summary

This document lists all custom graphics and icons added to Human Health.

## Tab Bar Icons (8 files)

Custom icons for bottom navigation with filled (active) and outline (inactive) variants:

### Today Tab
- `public/icons/today-filled.svg` - Calendar icon with dots (active state)
- `public/icons/today-outline.svg` - Calendar outline (inactive state)

### Lift Tab  
- `public/icons/lift-filled.svg` - Dumbbell icon solid (active state)
- `public/icons/lift-outline.svg` - Dumbbell outline (inactive state)

### Log Tab
- `public/icons/log-filled.svg` - Document/list icon solid (active state)
- `public/icons/log-outline.svg` - Document outline (inactive state)

### You Tab
- `public/icons/you-filled.svg` - Person icon solid (active state)
- `public/icons/you-outline.svg` - Person outline (inactive state)

**Design**: Each icon has clear filled/outline distinction, uses #c84712 accent color, sized at 24×24px viewBox.

---

## Check-In Chip Icons (4 files)

Emoji-style face icons for readiness check-in:

- `public/icons/ready.svg` - Smiling face (positive, energized)
- `public/icons/flat.svg` - Neutral face (low energy)
- `public/icons/sore.svg` - Frowning face (sore, recovering)
- `public/icons/peak.svg` - Star burst (peak performance)

**Design**: Circular icons with expressive faces, adult/terse style (not cartoonish), 24×24px viewBox.

---

## Metric & UI Icons (8 files)

Enhanced icons for metrics and interface elements:

### Metric Icons
- `public/icons/energy.svg` - Lightning bolt (energy/stamina metric)
- `public/icons/sleep.svg` - Crescent moon (sleep quality metric)

### Interface Icons
- `public/icons/timer.svg` - Filled circle clock (session timer)
- `public/icons/activity.svg` - Mountain peaks (activity/workout indicator)
- `public/icons/checkmark.svg` - Filled circle with bold check (completion)
- `public/icons/trend-up.svg` - Arrow with dot accent (progress trend)

### Legacy Icons (updated)
- `public/icons/dumbbell.svg` - Original dumbbell icon (kept for compatibility)

**Design**: Bold, distinctive shapes that work at small sizes, brand accent color (#c84712).

---

## Illustrations (3 files)

Custom SVG illustrations for hero sections and empty states:

### Hero Illustrations
- `public/illustrations/hero-upper.svg`
  - Soft peach gradient circle (160×160px)
  - Custom dumbbell icon centered
  - Gradient: #fff3ed → #ffe5d8 → #ffd4c0
  - Subtle shadow for depth
  - Used in Today view "Up Next" card

### Empty State Illustrations  
- `public/illustrations/empty-log.svg`
  - Clipboard with empty lines (240×240px)
  - Ghost dumbbell icon at bottom (subtle)
  - Muted gray palette (#e5e5ea)
  - Used when no workout history exists

- `public/illustrations/empty-metric.svg`
  - Bar chart placeholder (160×120px)
  - Muted bars with dash line
  - Used when metrics have no data
  - Subtle, delightful empty state

**Design**: Soft gradients, adult tone, crisp SVG rendering, optimized for mobile (430px).

---

## App Icon (1 file)

- `public/icon.svg`
  - 192×192px app icon with gradient background
  - Orange gradient (#d95821 → #c84712)
  - Large centered dumbbell in white
  - Rounded corners (42px radius)
  - Drop shadow for premium feel
  - Used for PWA home screen icon

---

## Component Changes

### icon-component.tsx
Enhanced to support both asset-based (external SVG) and inline SVG icons:

**New exports:**
- `Icon` - Main icon component (supports both modes)
- `HeroIllustration` - Hero section illustration wrapper
- `EmptyStateIllustration` - Empty state illustration wrapper

**Asset-based icons** (loaded from `/icons/` or `/illustrations/`):
All new custom icons listed above

**Inline SVG icons** (kept for backward compatibility):
- dumbbell (original)
- timer (fallback)
- energy (fallback)
- sleep (fallback)
- trend-up (fallback)
- checkmark (fallback)
- activity (fallback)
- user (fallback)

---

## Style Changes

### globals.css
Updated `.hero-illustration` styles:
- Removed old `.illustration-circle` gradient background
- Updated to support `<img>` rendering for SVG illustrations
- Maintains 120px width, flexible height
- Centered content with `flex` layout

---

## Usage Examples

### Tab Bar Icons
```tsx
<Icon name={tab === 'today' ? 'today-filled' : 'today-outline'} style={{fontSize: '1.5rem'}} />
```

### Check-In Chips
```tsx
<Icon name="ready" style={{fontSize: '1.8rem'}} />
<Icon name="flat" style={{fontSize: '1.8rem'}} />
<Icon name="sore" style={{fontSize: '1.8rem'}} />
<Icon name="peak" style={{fontSize: '1.8rem'}} />
```

### Hero Illustration
```tsx
<HeroIllustration type="upper" />
```

### Empty States
```tsx
<EmptyStateIllustration type="log" />
<EmptyStateIllustration type="metric" />
```

---

## Design System

### Colors
- **Primary accent**: #c84712 (orange-red)
- **Soft accent**: #fff3ed (peach)
- **Gradient stops**: #fff3ed → #ffe5d8 → #ffd4c0
- **Muted gray**: #e5e5ea
- **White**: #ffffff (icon fills, overlays)

### Sizing
- Tab bar icons: 1.5rem (24px equivalent)
- Check-in chips: 1.8rem (≈29px)
- Metric icons: 1.1rem (≈18px)
- Hero illustration: 160×160px (120px container)
- Empty states: 240px max-width (log), 160px (metric)

### Viewport
- Mobile-first: 430px base width
- Screenshots: 860×1848px (@2x retina)
- Touch targets: Minimum 44px (iOS HIG)

---

## File Count Summary

- **Tab bar icons**: 8 files (4 pairs)
- **Check-in icons**: 4 files
- **Metric/UI icons**: 8 files  
- **Illustrations**: 3 files
- **App icon**: 1 file

**Total**: 24 new/updated SVG assets

---

## Quality Assurance

✅ All icons use consistent viewBox (24×24)  
✅ All illustrations use soft gradients  
✅ Brand accent color (#c84712) applied consistently  
✅ SVG format for crisp rendering  
✅ Optimized file sizes (avg 300-700 bytes per icon)  
✅ No external dependencies  
✅ TypeScript types preserved  
✅ Backward compatible with existing Icon usage  
✅ npm run verify passes (typecheck, test, build, PWA)

---

## Visual Comparison

**Before**: Generic lucide/feather-style icons, thin strokes, no personality  
**After**: Custom branded icons, bold fills, distinctive shapes, app personality

**Result**: Human Health now feels like a real consumer fitness app (Apple Fitness / Hevy / Fitonist aesthetic).
