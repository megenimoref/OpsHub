# CHARTS & GRAPHS — LINEAR MODERN
## Token file: `tokens/charts.md`

This file defines how charts and graphs should look and behave inside the
Linear Modern design system. Every visual decision here must be derived from
the existing skill tokens — colors, typography, shadows, borders, and motion.
Charts are not a separate design system. They are surfaces that belong to the
same world as every other component.

---

## 0. AGENT RULES FOR EXISTING CHARTS

**Read this before touching any chart code.**

If the project already contains charts or graphs, your job is to restyle
them — not rewrite them. The data logic, the chart type, the data structure,
the props, and the component architecture are all off-limits.

**What you MAY change:**
- Colors (fills, strokes, gradients)
- Fonts and font sizes on axis labels, tooltips, legends
- Border radius on bars, tooltips, containers
- Shadow and background on the chart container card
- Grid line color, opacity, and style
- Animation duration and easing (if the library supports it)
- Tooltip background, border, and text styling
- Dot/point size and color on line charts
- Legend layout, spacing, and text styling

**What you MUST NOT change:**
- The chart library itself (do not swap Recharts for Chart.js or vice versa)
- Data fetching, data transformation, or data props
- The chart type (do not turn a bar chart into a line chart)
- Component file names or export names
- Any business logic inside the chart component
- The structure of the JSX — only add or change style-related props

**How to approach an existing chart:**
1. Read the component first — understand what library and chart type it uses
2. Identify which props accept style values (colors, fonts, sizes)
3. Apply the skill's tokens to those props only
4. Do not refactor, simplify, or "improve" the code structure
5. If a style cannot be applied without restructuring the component — leave it and note what couldn't be changed

**If the chart has inline styles or a separate styles file:**
Update the style values only. Do not reorganize how styles are applied.

**If the chart uses a config object:**
Update only the visual properties inside the config. Leave data and options
that affect chart behavior untouched.

---

## 1. LIBRARY

**Recommended:** Recharts (React)
**Why:** Recharts fits Linear Modern's personality — declarative, animatable,
and precise. Chart entry animations (bars growing, lines drawing) align with
the skill's motion tokens (expo-out, 200–300ms). The React-first API keeps
styling consistent with the rest of the component system. No bounce, no
spring — just decisive motion.

```bash
npm install recharts
```

---

## 2. COLOR PALETTE FOR DATA

Charts need a dedicated set of sequential data colors derived from the
skill's accent and blob palette. Never use arbitrary colors — every data color
should trace back to the skill's token system.

| Token | Hex | Usage |
|---|---|---|
| `data-1` | `#5E6AD2` | First series / most important (accent) |
| `data-2` | `#6872D9` | Second series (accent-bright) |
| `data-3` | `#7C3AED` | Third series (blob secondary) |
| `data-4` | `#3B82F6` | Fourth series (blob tertiary) |
| `data-5` | `#4F46E5` | Fifth series / least emphasis |
| `data-positive` | `#22C55E` | Gains, up trends, good states |
| `data-negative` | `#EF4444` | Losses, down trends, alerts |
| `data-neutral`  | `#8A8F98` | Flat/unchanged, zero baseline (fg-muted) |

**Rules:**
- [x] Color sequence — data-1 → data-5 in order of emphasis (accent-first)
- [x] Fills use 15–25% opacity; strokes use 100% for clarity on dark background
- [x] On hover: slight brighten or accent glow; no harsh contrast
- [x] Zero baseline / reference line: `data-neutral` (#8A8F98) at low opacity (~40%)

---

## 3. CHART CONTAINER

The outer wrapper that holds any chart. Should match the skill's card style.

```
Background:   rgba(255,255,255,0.05) — surface (card)
Border radius: 16px (rounded-2xl)
Shadow:       3-layer card (border highlight + diffuse + ambient)
Padding:      p-6–p-8 (24–32px) — standard card padding
Border:       rgba(255,255,255,0.06) — border-default
```

**Questions to answer:**
- [x] Chart container uses surface (glass-like dark card), not solid
- [x] Same hover behavior as other cards: -translate-y-[4px] + elevated shadow + optional accent glow, 300ms expo-out
- [x] Optional header area: title (Inter, gradient text if 3xl+) + time filter (JetBrains Mono label), same padding

---

## 4. TYPOGRAPHY IN CHARTS

All text inside charts must use the skill's font system (Inter + JetBrains Mono).

| Element | Font | Size | Weight | Color |
|---|---|---|---|---|
| Chart title | Inter | text-xl → text-2xl | 600 | #EDEDEF (fg) or gradient |
| Axis labels | Inter | text-sm | 400–500 | #8A8F98 (fg-muted) |
| Tick values | Inter or JetBrains Mono | text-xs | 400–500 | #8A8F98 (fg-muted) |
| Legend labels | Inter | text-sm | 500 | #EDEDEF (fg) |
| Tooltip values | Inter | text-base | 600 | #EDEDEF (fg) |
| Tooltip labels | Inter | text-sm | 400 | #8A8F98 (fg-muted) |

**Questions to answer:**
- [x] Numeric values use Inter 600 (precise, not playful); JetBrains Mono optional for dashboards
- [x] Max weight 600 — never 700 or 800 in this skill
- [x] Minimum readable size: text-xs (12px) at smallest breakpoint; never smaller

---

## 5. GRID & AXES

The structural skeleton of the chart. Should feel like the skill's visual
language — near-invisible borders, technical precision.

```
Grid lines:
  Color:    rgba(255,255,255,0.04) — border-subtle
  Style:    solid
  Width:    1px

Axis lines:
  Color:    rgba(255,255,255,0.06) — border-default
  Width:    1px
  Show X?   yes
  Show Y?   yes

Tick marks:
  Show?     optional; if yes, minimal length (4px)
  Color:    #8A8F98 (fg-muted)
```

**Questions to answer:**
- [x] Minimal grid lines — very subtle so data and accent lead; matches "nearly invisible" border rule
- [x] Axis labels: left for Y, bottom for X (standard)
- [x] Horizontal reference line at zero when relevant, using data-neutral at ~40% opacity

---

## 6. CHART TYPES & THEIR SPECIFIC RULES

### Line Chart
```
Line stroke:    2px, rounded linecap
Area fill:      gradient from accent to transparent; top opacity ~20%, bottom 0%
Data point dot: show on hover (default); or always for sparse data
Dot size:       6px
Dot border:     surface (rgba(255,255,255,0.05)) — floating dot effect
```

### Bar Chart
```
Bar fill:       data color at 80–100% opacity (readable on dark)
Bar radius:     top corners rounded-lg (8px) — match skill button/input radius
Bar gap:        gap between bars in group: 4–8px
Hover state:    slight brighten + optional 1px accent border (rgba(94,106,210,0.3))
```

### Area Chart
```
Fill:           gradient: accent at top (~20% opacity) → transparent at bottom
Stroke:         accent at full opacity, 2px
Gradient stops: top 0.2 → bottom 0
```

### Donut / Pie Chart
```
Segment gap:    1–2px between segments (subtle separation)
Center label:   total value or primary metric; Inter 600, text-xl–2xl
Center font:    Inter
Hover:          segment brightens slightly; no heavy lift (precise, not playful)
Radius:         inner ~55% / outer 100% (donut ratio)
```

### Stat Card (single number)
```
Value font:     Inter, font-weight 600, text-3xl → text-4xl
Delta display:  arrow + percentage; positive #22C55E, negative #EF4444
Sparkline:      mini line chart below, same data-1 color, stroke 1.5–2px
```

---

## 7. TOOLTIP

The most important interactive element in charts. Must feel native to the skill.

```
Background:   rgba(255,255,255,0.08) — surface-hover (slightly brighter than card)
Shadow:       3-layer (border highlight + diffuse) — same as card
Border radius: 6px (rounded-md) — tooltip token from borders
Padding:      12–16px (p-3 to p-4)
Border:       rgba(255,255,255,0.06) — border-default

Label:        Inter, #8A8F98, text-sm
Value:        Inter, #EDEDEF, font-weight 600, text-base
Color dot:    6px circle, matching data series color
```

**Questions to answer:**
- [x] Tooltip anchors to data point (library default); stable, not cursor-follow for precision
- [x] Vertical cursor line on hover: optional; if present, use rgba(255,255,255,0.06)
- [x] Animate in: fade (200ms expo-out) — fast and precise
- [x] Show all series at that x-position when multiple series (Recharts default)

---

## 8. LEGEND

```
Position:     bottom (below chart) or inline with chart title (right)
Layout:       horizontal row, gap-4 (16px)
Item spacing: 16px between legend items
Color swatch: circle, 8px; or short line stroke 2px for line charts
Font:         Inter, text-sm, #EDEDEF (fg)
```

---

## 9. MOTION & ANIMATION

Chart animations must match the skill's motion token system — precise, not playful.

```
Entry animation:    bars grow from zero; lines draw left to right (Recharts default)
Duration:           300ms (standard) for card-sized charts; 200ms (fast) for small
Easing:             cubic-bezier(0.16, 1, 0.3, 1) — expo-out
Stagger:            series animate together; no stagger (keeps chart readable)
Hover transition:   200ms (fast) for tooltip appear / data point highlight
```

**Questions to answer:**
- [x] Personality supports decisive entry (bars grow, lines draw) — engineered, not bouncy
- [x] Bars grow from zero; do not fade in only
- [x] Line draws left to right when library supports it; otherwise appear with 200–300ms fade

**Reduced motion:** Respect `prefers-reduced-motion`; set duration to 0 or minimal (see motion.md).

---

## 10. EMPTY & LOADING STATES

```
Loading:      Skeleton matching skill — rounded-2xl, surface bg, 3-layer shadow,
              subtle rgba(255,255,255,0.04) pulse or shimmer; same padding as chart
Empty:        Centered message + icon; Inter, #8A8F98; optional gradient headline
Error:        #EF4444 for message; retry uses accent + 3-layer accent button shadow
```

---

## 11. RESPONSIVE BEHAVIOR

```
Mobile (< 640px):
  - Hide Y-axis labels? no — keep but reduce tick count
  - Reduce tick count? yes (e.g. 3–4 ticks per axis)
  - Simplify tooltip? no — keep full content, ensure touch targets
  - Minimum chart height: 240px

Tablet (640–1024px):
  - Standard tick count; full legend
  - Chart container padding: p-6 (24px) if needed

Desktop (> 1024px):
  - Full feature set; p-8 container padding
```

---

## 12. ACCESSIBILITY

- [ ] All data colors meet 3:1 contrast against the chart background (surface rgba(255,255,255,0.05) — use full-opacity strokes and sufficient fill contrast)
- [ ] Charts have `role="img"` and `aria-label` describing the data
- [ ] Tooltips are keyboard accessible (tab through data points where supported)
- [ ] Color is never the only differentiator — legend labels and (where possible) stroke style support
- [ ] Animations respect `prefers-reduced-motion` (see motion.md)

---

## 13. QUICK REFERENCE — THE NON-NEGOTIABLES

| Property | Value |
|---|---|
| Data color 1 | #5E6AD2 |
| Data color 2 | #6872D9 |
| Data color 3 | #7C3AED |
| Positive/up color | #22C55E |
| Negative/down color | #EF4444 |
| Grid line color | rgba(255,255,255,0.04) |
| Tooltip background | rgba(255,255,255,0.08) |
| Chart card shadow | 3-layer (border + diffuse + ambient) |
