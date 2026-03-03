# TOKENS — BORDERS & RADIUS

## The Core Rule: Nearly Invisible, Layered Depth

Borders in this system are not structural lines — they are soft light catches.
At 6% white opacity, they are barely visible. Their job is to define edges
through ambient reflection, not through contrast.

A prominent border (`1px solid rgba(255,255,255,0.3)`) breaks the glass-like
depth illusion. The surface no longer feels like frosted glass — it feels like
a box with a border. This is the most common mistake in dark UI design.

---

## Border Opacity Scale

| Name | Value | Usage |
|---|---|---|
| `border-subtle` | `rgba(255,255,255,0.04)` | Background separators, grid lines |
| `border-default` | `rgba(255,255,255,0.06)` | All card and container borders |
| `border-hover` | `rgba(255,255,255,0.10)` | Border on interactive hover |
| `border-accent` | `rgba(94,106,210,0.30)` | Accent-tinted borders, gradient borders |
| `border-input` | `rgba(255,255,255,0.10)` | Form input borders |
| `border-input-focus` | `#5E6AD2` | Input border on focus (solid accent) |

---

## Radius Scale

| Element | Radius | Tailwind | Reason |
|---|---|---|---|
| Page-level containers | `16px` | `rounded-2xl` | Generous — matches cinematic scale |
| Cards | `16px` | `rounded-2xl` | Standard surface radius |
| Buttons | `8px` | `rounded-lg` | Precise, not pill-shaped |
| Inputs | `8px` | `rounded-lg` | Matches button radius for form harmony |
| Icon containers | `12px` | `rounded-xl` | Between card and button |
| Badges / Pills | `9999px` | `rounded-full` | Tag-style labels only |
| Tooltips | `6px` | `rounded-md` | Small, precise |
| Avatar / Icon | `50%` | `rounded-full` | Circular only for avatars |

---

## Gradient Border Technique (Hover State)

The most distinctive border effect in this skill — a gradient border
that fades in on hover. Creates the animated glass edge look.

```css
/* Method: mask-composite technique */
.gradient-border-card {
  position: relative;
}

.gradient-border-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 16px;  /* must match card radius */
  padding: 1px;
  background: linear-gradient(
    135deg,
    rgba(255,255,255,0.15) 0%,
    rgba(94,106,210,0.3) 50%,
    transparent 100%
  );
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 300ms cubic-bezier(0.16, 1, 0.3, 1);
}

.gradient-border-card:hover::before {
  opacity: 1;
}
```

---

## Section Dividers

Between sections, use gradient dividers — not solid lines:

```css
/* Gradient line — the standard section separator */
.section-divider {
  height: 1px;
  background: linear-gradient(
    to right,
    transparent 0%,
    rgba(255,255,255,0.08) 30%,
    rgba(255,255,255,0.08) 70%,
    transparent 100%
  );
}

/* Or via Tailwind: */
/* h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent */
```

---

## Rules

1. **Default cards: 6% white opacity** — never more at rest state.
2. **Hover: maximum 10% white opacity** — still subtle, just brighter.
3. **Always `rounded-2xl` for cards** — `rounded-lg` feels too small for this scale.
4. **Never solid white borders** — even `rgba(255,255,255,0.15)` is too bright for resting state.
5. **Gradient borders on hover only** — never at rest (adds too much visual weight).
6. **Section dividers are gradients** — never flat 1px solid lines.
7. **Inputs use 10% opacity** — slightly more visible than cards for usability.
