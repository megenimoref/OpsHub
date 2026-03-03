# EXAMPLES — README

## LandingPage.jsx — THE NORTH STAR

Study this file in full before building any page with the linear-modern skill.
Every major pattern is demonstrated here working together as a complete system.

**What to notice in each section:**

**Background:** Four-layer composition — radial gradient base + noise texture + animated
blobs (primary/secondary/tertiary/bottom-pulse) + 64px grid overlay. Each layer
is invisible alone. Together they create genuine atmospheric depth. Never skip any layer.

**Nav:** Frosted glass with `backdrop-filter: blur(20px)` and `background: rgba(5,5,6,0.8)`.
Sticky positioning. Border is gradient line (transparent → visible → transparent).
Logo mark: small accent square with glow shadow — acts as a miniature light source.
Links use `font-weight` change (400→500) and subtle `bg-white/8` on hover — no underlines.

**Hero:** Gradient text on the headline — white fading to 70% opacity at the bottom.
Accent shimmer animation on the key phrase (3s linear loop). Badge uses pill shape
with accent border and animated dot. Command pill uses split design: dark accent
left column + dark surface right. Both entrance animations use `fadeUp` with 0.1s stagger.

**Stats:** Grid of elevated dark surfaces (`#0a0a0c`) with shared 1px borders forming
a unified panel. Numbers use gradient text. Labels are muted. No glow on stats —
they read through restraint, not emphasis.

**Features (Bento):** Asymmetric 6-column grid — the first card spans 4×2.
Every card has: mouse-tracking spotlight (300px radial at 12% accent opacity) +
gradient border that fades in on hover (mask-composite technique) + translateY(-4px)
lift. All three effects together create the "premium interactive" feel.
Remove any one and the cards feel flat or generic.

**Pricing:** Featured card extends visually with `scale(1.02)` and `translateY(-4px)`
at rest. Accent glow shadow (not just dark shadow) on featured card. Check icons
in small accent circles. All cards hover to lift further.

**CTA:** Simple — gradient headline, shimmer accent phrase, two buttons centered.
The background blobs do the visual work. The section doesn't need decoration.

**Footer:** Gradient divider above. Accent square logo mark. Muted links that
brighten on hover (`color` transition, no underline).

---

## What Every Page Must Have Before Shipping

- [ ] Full 4-layer background system (gradient + noise + blobs + grid) — no flat backgrounds
- [ ] Blobs use different animation durations (8s, 10s, 12s) to desynchronize
- [ ] Frosted glass navbar with `backdrop-filter: blur(20px)`
- [ ] Gradient text on all headlines 3xl and above
- [ ] Accent shimmer text on at least one key phrase per hero section
- [ ] Multi-layer shadows on ALL elevated surfaces — never single-layer
- [ ] Mouse-tracking spotlight on feature/interactive cards
- [ ] Gradient border on card hover (mask-composite technique)
- [ ] Bento grid is asymmetric — at minimum one card spans more than others
- [ ] All hover transforms max 8px — never more
- [ ] All transitions use expo-out `[0.16, 1, 0.3, 1]` at 200-300ms
- [ ] Focus states use `0 0 0 2px #050506, 0 0 0 4px rgba(94,106,210,0.5)`
- [ ] Buttons use 3-layer shadow: border ring + diffuse glow + inner highlight
- [ ] Section dividers are gradient lines — not solid 1px borders
- [ ] Background never uses pure `#000000` — always `#050506` or `#020203`
- [ ] Text never uses pure `#FFFFFF` — always `#EDEDEF` for primary
