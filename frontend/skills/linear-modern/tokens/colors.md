# TOKENS — COLORS

## The Palette Philosophy

This palette is built on near-black bases with a single saturated indigo accent.
The accent color (`#5E6AD2`) is used primarily as emitted light — in glows,
blob ambience, and gradient borders — not as fill or decoration.

The near-black backgrounds use `#050506` not `#000000`. The slight blue shift
in the near-black creates tonal harmony with the indigo accent and prevents
the harsh flatness of true black. This detail is non-negotiable.

---

## Color Table

### Backgrounds

| Token | CSS Var | Hex / Value | Tailwind | Usage |
|---|---|---|---|---|
| `bg-deep` | `--color-bg-deep` | `#020203` | `bg-[#020203]` | Absolute darkest — footer, deepest layers |
| `bg-base` | `--color-bg-base` | `#050506` | `bg-[#050506]` | Primary page canvas |
| `bg-elevated` | `--color-bg-elevated` | `#0a0a0c` | `bg-[#0a0a0c]` | Elevated surfaces, mock interfaces |
| `surface` | `--color-surface` | `rgba(255,255,255,0.05)` | `bg-white/5` | Card backgrounds, containers |
| `surface-hover` | `--color-surface-hover` | `rgba(255,255,255,0.08)` | `bg-white/[0.08]` | Hovered card state |

### Text

| Token | CSS Var | Hex / Value | Tailwind | Usage |
|---|---|---|---|---|
| `fg` | `--color-fg` | `#EDEDEF` | `text-[#EDEDEF]` | Primary text — bright but not pure white |
| `fg-muted` | `--color-fg-muted` | `#8A8F98` | `text-[#8A8F98]` | Body text, descriptions, metadata |
| `fg-subtle` | `--color-fg-subtle` | `rgba(255,255,255,0.60)` | `text-white/60` | Tertiary text, placeholders |

### Accent

| Token | CSS Var | Hex / Value | Tailwind | Usage |
|---|---|---|---|---|
| `accent` | `--color-accent` | `#5E6AD2` | `bg-[#5E6AD2]` | Primary interactive — buttons, links |
| `accent-bright` | `--color-accent-bright` | `#6872D9` | `bg-[#6872D9]` | Hover state for accent |
| `accent-glow` | `--color-accent-glow` | `rgba(94,106,210,0.3)` | `bg-[rgba(94,106,210,0.3)]` | Glow effects, blob ambience |

### Borders

| Token | CSS Var | Hex / Value | Tailwind | Usage |
|---|---|---|---|---|
| `border` | `--color-border` | `rgba(255,255,255,0.06)` | `border-white/[0.06]` | Subtle hairline borders |
| `border-hover` | `--color-border-hover` | `rgba(255,255,255,0.10)` | `border-white/10` | Border on hover |
| `border-accent` | `--color-border-accent` | `rgba(94,106,210,0.30)` | `border-[rgba(94,106,210,0.3)]` | Accent-tinted borders, gradient borders |

---

## The Gradient Text System

Headlines use gradient fills rather than flat color. This adds dimensionality
and prevents the harsh look of pure white on near-black.

**Standard headline gradient (white to semi-transparent):**
```css
background: linear-gradient(to bottom, #ffffff, rgba(255,255,255,0.7));
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
background-clip: text;
```

**Accent shimmer gradient (animated):**
```css
background: linear-gradient(to right, #5E6AD2, #818cf8, #5E6AD2);
background-size: 200% auto;
animation: shimmer 3s linear infinite;
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;

@keyframes shimmer {
  from { background-position: 0% center; }
  to   { background-position: 200% center; }
}
```

---

## The Blob Color System

Blobs are the accent color at very low opacity, heavily blurred.
Each blob uses slightly different hues to create natural color variation.

```
Primary blob:   #5E6AD2 at 25% opacity — top-center (900×1400px, blur 150px)
Secondary blob: mix of #7C3AED + #EC4899 at 15% opacity — left (600×800px, blur 120px)
Tertiary blob:  mix of #4F46E5 + #3B82F6 at 12% opacity — right (500×700px, blur 100px)
Bottom blob:    #5E6AD2 at 10% opacity — lower center, pulsing
```

---

## Color Rules

1. **Never pure black** — `#050506` is the base. `#020203` is the maximum.
2. **Never pure white** — `#EDEDEF` for primary text. `rgba(255,255,255,0.6)` for tertiary.
3. **Accent is light, not paint** — use accent for glows and ambience, not large fills.
4. **Borders are nearly invisible** — 6% white opacity default, 10% on hover maximum.
5. **Gradient text on display sizes** — any headline 3xl or larger uses gradient fill.
6. **Accent backgrounds are rare** — only primary CTA buttons and selected/active states.
7. **Everything dark** — even "light" surfaces are dark (`rgba(255,255,255,0.05)`).
