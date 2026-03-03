---
name: linear-modern
version: 1.0.0
stack: React + Tailwind CSS + Framer Motion
category: dark
mood: cinematic, precise, premium, atmospheric, technical
---

# LINEAR MODERN SKILL

A complete design system inspired by Linear, Vercel, and Raycast — the gold standard
of premium developer tool aesthetics. Deep near-black surfaces with layered ambient
lighting, animated gradient blobs, mouse-tracking spotlights, and obsessively refined
micro-interactions. Every shadow has three layers. Every gradient transitions through
multiple stops. Every animation uses expo-out easing at exactly 200-300ms.

This is software that feels expensive without feeling ostentatious.

---

## HOW TO USE THIS SKILL

### STEP 1 — Read intent before code
Read these files in order before generating anything:

1. `philosophy.md`           ← The soul. Read this first, always.
2. `tokens/colors.md`        ← Deep space palette. Every value is deliberate.
3. `tokens/shadows.md`       ← Multi-layer shadows. The glow system.
4. `tokens/typography.md`    ← Inter/Geist. Gradient text treatment.
5. `tokens/borders.md`       ← Near-invisible borders. Layered radius.
6. `tokens/motion.md`        ← Expo-out easing. 200-300ms. Precise.
7. `tokens/spacing.md`       ← Asymmetric bento grids. Section rhythm.
8. `tokens/charts.md`        ← Dashboards, Charts & graphs. Data colors, tooltips, motion.

### STEP 2 — Set up the project
Follow `integration/setup.md` exactly. The background system requires
specific CSS layering to work correctly.

### STEP 3 — Study components as reference patterns
Components in this skill use mouse-tracking effects, multi-layer shadows,
and animated gradient borders. The WHY annotations explain when and why
each technique is applied. Study these before building new components.

### STEP 4 — Use examples as your quality benchmark
Read `examples/LandingPage.jsx` in full before building any page.
The animated blobs, parallax hero, and bento grid are the signature
elements — without them the design becomes flat and generic.

---

## WHAT YOU CAN OVERRIDE
- **Accent color**: `#5E6AD2` indigo can be replaced with another saturated color.
  Maintain the glow/ambient lighting behavior — the color changes, not the technique.
- **Font sizes**: Can scale one step up or down.
- **Blob positions and colors**: Adjust for brand alignment while maintaining blur and opacity.
- **Content and copy**: All placeholder text.

## WHAT YOU MUST NEVER OVERRIDE
- **Background base**: Never use pure `#000000`. Always `#050506` or deeper `#020203`.
  The near-black with slight blue tint is foundational.
- **Background layering**: Never use a flat solid background. The multi-layer
  gradient + noise + grid system is non-negotiable.
- **Multi-layer shadows**: Never single-layer shadows. Always combine border
  highlight + soft diffuse + optional accent glow.
- **Animated blobs**: Every hero section needs floating gradient blobs.
  Without them the design becomes flat and generic immediately.
- **Expo-out easing**: `[0.16, 1, 0.3, 1]` for all transitions. Never spring,
  never bounce, never linear.
- **Animation speed**: 200-300ms for interactions, never slower.
  Nothing in this skill is slow or bouncy.
- **Border opacity**: Borders are never prominent. Max 10% white opacity.
  Visible borders break the glass-like depth illusion.
- **Near-white foreground**: Text is `#EDEDEF`, never pure `#FFFFFF`.

---

## AGENT BEHAVIOR RULES
- Every page background needs the full layered system: base gradient + blobs + noise + grid.
- Cards must have the multi-layer shadow — never `box-shadow: 0 2px 4px rgba(0,0,0,0.1)`.
- Accent buttons always have the glow effect. A flat indigo button looks wrong here.
- Mouse-tracking spotlight is optional but strongly preferred on feature cards.
- Bento grids must be asymmetric — never uniform card sizes.
- Gradient text on headlines is required for display/hero sizes.
- All hover movements are maximum 8px. This is precise, not playful.
- Focus rings use accent color at 50% opacity with matching offset.
- Animated gradient borders on card hover are the premium differentiator — use them.
- Blob animations should use different durations (8s, 10s, 12s) to desynchronize.

---

## STACK REQUIREMENTS
- React 18+
- Tailwind CSS 3+
- Framer Motion 10+ (for entrance animations and parallax)
- Inter or Geist Sans via Google Fonts or next/font
- Lucide React (strokeWidth 1.5, never chunky)
