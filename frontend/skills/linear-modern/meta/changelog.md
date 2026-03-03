# CHANGELOG — LINEAR MODERN SKILL

## v1.0.0 — Initial Release

**Tokens (7 files):**
- `colors.md` — Deep space palette, 14 tokens, gradient text system, blob color specs
- `typography.md` — Inter/Geist, gradient text treatment, shimmer animation, eyebrow label pattern
- `shadows.md` — 3-layer shadow system, mouse-tracking spotlight, gradient border technique
- `borders.md` — Near-invisible borders (6% white), radius scale, gradient border on hover
- `motion.md` — Expo-out `[0.16, 1, 0.3, 1]`, 200-300ms, blob/shimmer/fadeUp keyframes, Framer Motion variants
- `spacing.md` — 4px base unit, asymmetric bento grid system, section spacing rules

**Integration (3 files):**
- `tailwind.config.js` — `lm.*` color tokens, shadow scale, animation utilities, expo-out easing
- `globals.css` — CSS variables, 4-layer background system, blob animations, gradient text utilities
- `setup.md` — Dependency install, config wiring, background system setup, verification snippet

**Components (7 files):**
- `Button.jsx` — Primary (3-layer glow), secondary (glass), ghost. Loading state, active scale.
- `Input.jsx` — Dark recessed surface, accent focus ring glow, icon slot, error/hint states
- `Card.jsx` — Mouse-tracking spotlight, gradient border hover, 3-layer shadow, 3 variants
- `Alert.jsx` — Semantic color tints at low opacity, left accent border, icon containers
- `Navbar.jsx` — Frosted glass sticky nav, accent square logo mark, mobile hamburger menu
- `Spinner.jsx` — Thin SVG arc, ProgressBar with lead-edge glow, Skeleton pulse

**Examples (2 files):**
- `LandingPage.jsx` — Complete north star with background system, hero, stats, asymmetric bento, pricing, CTA
- `README.md` — Section-by-section guide, pre-ship checklist

**Responsive + Meta:**
- `breakpoints.md` — Mobile nav, bento collapse, touch target rules, performance notes
- `changelog.md` — This file
