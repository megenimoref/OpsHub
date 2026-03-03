# TOKENS — MOTION

## Motion Philosophy

This design system moves like precision engineering, not playful toys.
Every animation is swift, decisive, and purposeful. The expo-out easing
`[0.16, 1, 0.3, 1]` is the single most important technical value in the system —
it exits rest state fast and decelerates smoothly into the final position.
Like a drawer sliding closed on a quality piece of furniture.

**The test:** Does this animation communicate confidence and precision?
If it bounces, overshoots, or feels springy — it is wrong for this skill.

---

## Duration Scale

| Token | Value | Usage |
|---|---|---|
| `instant` | 100ms | Immediate state changes — color switches, opacity |
| `fast` | 200ms | Hover states, border changes, button states |
| `standard` | 300ms | Card hover, gradient border fade-in |
| `entrance` | 600ms | Element entrance animations |
| `blob` | 8000–12000ms | Background blob float animations |
| `shimmer` | 3000ms | Accent text shimmer loop |

---

## Easing Curves

| Name | Value | Usage |
|---|---|---|
| `expo-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | **THE primary easing.** All interactive transitions. |
| `ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | Simple hover fades, opacity transitions |
| `ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | Blob animations only — smooth continuous float |
| `linear` | `linear` | Shimmer animation — requires constant velocity |

**Never use:** spring physics, bounce, or overshoot curves.

---

## Keyframe Library

### Blob Float — background ambient shapes
```css
@keyframes blob-float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  33%       { transform: translateY(-20px) rotate(1deg); }
  66%       { transform: translateY(10px) rotate(-0.5deg); }
}
/* Duration: 8s–12s, stagger different blobs */
/* Each blob should have a different duration to desync */

@keyframes blob-pulse {
  0%, 100% { opacity: 0.10; transform: scale(1); }
  50%       { opacity: 0.15; transform: scale(1.05); }
}
/* Duration: 4s, for the bottom accent blob */
```

### Shimmer — gradient text animation
```css
@keyframes shimmer {
  from { background-position: 0% center; }
  to   { background-position: 200% center; }
}
/* Duration: 3s, linear, infinite */
```

### Fade Up — element entrances
```css
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}
/* Duration: 600ms, expo-out */
/* Stagger children: 80ms delay between items */
```

### Scale In — card/modal entrances
```css
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}
/* Duration: 600ms, expo-out */
```

### Grid Reveal — staggered grid item entrances
```css
/* Apply to each grid item with increasing delay */
animation-delay: calc(var(--i) * 80ms);
```

---

## Interaction Patterns

### Hover Lift (cards)
```css
/* Resting */
transform: translateY(0);
box-shadow: [standard card shadow];

/* Hover */
transform: translateY(-4px);  /* max 8px — never more */
box-shadow: [elevated card shadow with accent glow];

transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1),
            box-shadow 300ms cubic-bezier(0.16, 1, 0.3, 1);
```

### Button Press
```css
/* Active */
transform: scale(0.98);
/* Transition: 100ms ease-out */
/* WHY: The subtle scale-down communicates physical press. */
/* Never go below scale(0.96) — it looks exaggerated. */
```

### Mouse-Tracking Spotlight
```jsx
// On card, track mousemove event:
const handleMouseMove = (e) => {
  const rect = e.currentTarget.getBoundingClientRect();
  setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
};

// Apply as background::before overlay:
background: `radial-gradient(
  300px circle at ${mouse.x}px ${mouse.y}px,
  rgba(94,106,210,0.12),
  transparent 70%
)`;
// Opacity: 0 at rest → 1 on hover (200ms ease-out transition)
```

---

## Framer Motion Variants

```js
// Fade up — for section content
export const fadeUp = {
  hidden:  { opacity: 0, y: 24 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
  }
}

// Stagger container
export const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
}

// Scale in — for cards
export const scaleIn = {
  hidden:  { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1, scale: 1,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
  }
}

// Parallax hero (scroll-linked)
// opacity: scrollY > 0 ? 1 - scrollY/400 : 1
// scale: 1 - scrollY * 0.00015
// y: scrollY * 0.25
```

---

## Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
  /* Blobs become static */
  /* Shimmer stops */
  /* Parallax disabled */
}
```

In Framer Motion:
```jsx
const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const variants = prefersReduced ? {} : animationVariants;
```
