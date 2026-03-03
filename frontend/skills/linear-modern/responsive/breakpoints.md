# RESPONSIVE — BREAKPOINTS

## Breakpoint System

| Name | Min Width | Tailwind | Description |
|---|---|---|---|
| mobile | 0px | base | Single column, simplified layout |
| md | 768px | `md:` | Tablet, 2-3 columns |
| lg | 1024px | `lg:` | Desktop, full bento expression |
| xl | 1280px | `xl:` | Wide desktop, max containers |

---

## Mobile Adaptations

### Headlines
Scale down dramatically but keep gradient text treatment:
- `text-7xl`/`text-8xl` (desktop) → `text-4xl`/`text-5xl` (mobile)
- Use `clamp()`: `clamp(36px, 8vw, 96px)` for smooth scaling
- Letter-spacing: keep `-0.04em` — it reads better at smaller sizes too

### Background System
- Keep all 4 layers on mobile — they are lightweight CSS
- Blobs: reduce sizes by 40% on mobile to avoid overwhelming the screen
- Grid overlay: same, unaffected

### Navbar
- Desktop: inline links visible
- Mobile: links hidden, hamburger `Menu` icon shown (right side)
- Mobile menu: animated dropdown panel below nav bar
  - `background: rgba(5,5,6,0.95)`, `backdrop-filter: blur(20px)`
  - Links stack vertically with 10px padding
  - Full-width CTA button at bottom of panel
  - Panel animates: `opacity: 0→1`, `translateY(-8px → 0)`, 200ms expo-out

### Feature Bento Grid
- Desktop: 6-column asymmetric grid (`col-span-4`, `col-span-2`, etc.)
- Tablet (`md:`): 2-column grid, all cards `col-span-1`
- Mobile: Single column, all cards full width, `row-span` ignored
- The asymmetry is a desktop-only expression — don't force it on mobile

### Pricing Grid
- Desktop: 3-column side-by-side, featured card scaled up
- Tablet: 2-column (Free + Pro, Team below)
- Mobile: Single column, featured card loses scale effect

### Section Padding
- Mobile: `py-16` (64px)
- Tablet: `py-24` (96px)
- Desktop: `py-32` (128px)

### Container Padding
- Mobile: `px-4` (16px)
- Tablet: `px-6` (24px)
- Desktop: `px-8` (32px)

---

## Touch Targets

All interactive elements must meet minimum 44×44px touch target on mobile:
- Buttons: add `min-height: 44px` — never below this
- Nav links in mobile menu: `padding: 12px 16px` ensures adequate height
- Icon-only buttons: wrap in 44×44px container

---

## Mouse-Tracking Effects on Mobile

Mouse-tracking spotlight uses `onMouseMove` events — these do not fire on touch.
The spotlight should be conditionally hidden on touch devices:

```js
const isTouchDevice = window.matchMedia("(hover: none)").matches;
// Don't attach mousemove handler if isTouchDevice
```

The gradient border hover effect also won't trigger on touch — this is acceptable.
Cards should still have their base glow shadow even without hover state.

---

## Performance on Mobile

- Blobs use `filter: blur()` which is GPU-accelerated — acceptable on modern devices
- If targeting older devices, reduce blur radius by 50% and opacity by 50%
- Disable parallax scroll effects on mobile — they cause jank on 60fps mobile screens
- Framer Motion `useScroll` effects: add `{ passive: true }` to scroll listeners
