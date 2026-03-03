# TOKENS — SPACING

## Base Unit: 4px

Standard Tailwind spacing scale. Generous section padding creates
the cinematic breathing room that defines premium software interfaces.

---

## Spacing Scale

| Token | Value | Tailwind | Usage |
|---|---|---|---|
| `space-1` | 4px | `p-1` | Micro — icon padding, tight gaps |
| `space-2` | 8px | `p-2` | Small — badge padding, label gaps |
| `space-3` | 12px | `p-3` | Compact — dense UI elements |
| `space-4` | 16px | `p-4` | Standard — small component padding |
| `space-6` | 24px | `p-6` | Card padding (standard) |
| `space-8` | 32px | `p-8` | Card padding (generous) |
| `space-12` | 48px | `p-12` | Section inner spacing |
| `space-16` | 64px | `py-16` | Mobile section padding |
| `space-24` | 96px | `py-24` | Standard section vertical padding |
| `space-32` | 128px | `py-32` | Large section / between sections |
| `space-40` | 160px | `py-40` | Hero section padding |

---

## Layout Widths

| Token | Value | Usage |
|---|---|---|
| `max-w-content` | 1152px (`max-w-6xl`) | Standard content container |
| `max-w-narrow` | 768px | Text-heavy content, blog |
| `max-w-hero` | 960px | Hero headline constraint |

---

## Bento Grid System

The asymmetric bento grid is the signature layout pattern of this skill.
Uniform card sizes are explicitly wrong.

### 6-Column Desktop Grid
```css
display: grid;
grid-template-columns: repeat(6, 1fr);
grid-auto-rows: 180px;
gap: 16px; /* or 24px for more breathing room */
```

### Required size variety:
```
Large hero card:   col-span-4, row-span-2  (fills 4 of 6 columns, double height)
Medium card:       col-span-2, row-span-1  (2 columns, single height)
Wide card:         col-span-3, row-span-1  (3 columns, half width)
Tall card:         col-span-2, row-span-2  (2 columns, double height)
Standard card:     col-span-2, row-span-1  (equal split)
```

### Example arrangement (6 cards):
```
[  Hero Card 4×2  ] [ Tall 2×2 ]
[  Hero Card 4×2  ] [ Med  2×1 ]
[ Wide 3×1 ][ Wide 3×1 ][ std ]
```

### Responsive collapse:
- `lg:` (1024px+) — Full asymmetric bento
- `md:` (768px) — 2 columns, some spans preserved
- Mobile — Single column, all cards full width

---

## Section Spacing Rules

- Standard section: `py-24` (96px) vertical padding
- Hero section: `py-32` to `py-40` — maximum drama
- Between heading and body: `mt-6` (24px)
- Between body and CTA: `mt-10` (40px)
- Stagger gap between section label and heading: `mt-4` (16px)
- Grid gap: `gap-4` to `gap-6` — tight enough to feel like a unified surface

---

## Component Gaps

| Pattern | Gap |
|---|---|
| Icon + label | `gap-2` (8px) |
| Button + button | `gap-3` (12px) |
| Feature list items | `gap-4` (16px) |
| Card grid | `gap-4` to `gap-6` |
| Section heading + subtext | `gap-4` (16px) |
| Nav links | `gap-8` (32px) |
