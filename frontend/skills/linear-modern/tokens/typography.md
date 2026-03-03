# TOKENS — TYPOGRAPHY

## The Philosophy

Clean, technical, and precise. Inter or Geist Sans — the typefaces of choice
for the best developer tools. Not a serif in sight. Not a display quirk.
The typography is invisible infrastructure that lets the design breathe.

What makes the type special in this system is not the font choice — it is
the gradient text treatment on headlines and the obsessive attention to
tracking, weight, and line-height combinations.

---

## Fonts

| Role | Family | Source | Weights |
|---|---|---|---|
| All text | Inter | Google Fonts / next/font | 300, 400, 500, 600 |
| Fallback | Geist Sans, system-ui, sans-serif | System | — |
| Labels/Mono | JetBrains Mono | Google Fonts | 400, 500 |

Google Fonts import:
```
https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap
```

---

## Type Scale

| Level | Size | Weight | Tracking | Line Height | Usage |
|---|---|---|---|---|---|
| `display` | 7xl–8xl (72–96px) | 600 semibold | `-0.03em` | `leading-none` | Hero headlines — always gradient text |
| `h1` | 5xl–6xl (48–60px) | 600 semibold | `-0.025em` | `leading-tight` | Section headers — gradient text |
| `h2` | 3xl–4xl (30–36px) | 600 semibold | `-0.02em` | `leading-tight` | Subsection headers |
| `h3` | xl–2xl (20–24px) | 600 semibold | `-0.01em` | `leading-snug` | Card titles |
| `body-lg` | lg–xl (18–20px) | 400 regular | `0` | `leading-relaxed` | Lead paragraphs |
| `body` | sm–base (14–16px) | 400 regular | `0` | `leading-relaxed` | Standard content |
| `label` | xs (12px) | 500 mono | `0.1em` | `leading-normal` | Section tags, metadata, eyebrows |
| `caption` | xs (11px) | 400 | `0.05em` | `leading-normal` | Fine print, timestamps |

---

## Gradient Text Treatment

### Standard Display Gradient (required for 3xl and above)
```css
background: linear-gradient(
  to bottom,
  rgba(255,255,255,1) 0%,
  rgba(255,255,255,0.95) 40%,
  rgba(255,255,255,0.70) 100%
);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
background-clip: text;
```

WHY: Pure white headlines on near-black feel harsh. The bottom fade to 70% opacity
creates dimensionality — the headline appears to recede into the dark background.
It is the single most effective typographic technique in this system.

### Accent Shimmer Text (for key phrases or CTAs)
```css
background: linear-gradient(
  to right,
  #5E6AD2 0%,
  #818cf8 50%,
  #5E6AD2 100%
);
background-size: 200% auto;
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
background-clip: text;
animation: shimmer 3s linear infinite;

@keyframes shimmer {
  from { background-position: 0% center; }
  to   { background-position: 200% center; }
}
```

Use on: one key phrase per hero section, key product benefits, CTA labels.
Never on: entire paragraphs, navigation, or body text.

---

## Section Label Pattern (eyebrow)

Labels above section headings always use JetBrains Mono, uppercase:

```jsx
<span style={{
  fontFamily: "JetBrains Mono, monospace",
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "#5E6AD2",
  opacity: 0.8,
}}>
  // features
</span>
```

Common patterns: `// overview`, `feat. 01`, `→ what we build`, `[01]`

---

## Icon Settings (Lucide React)
```jsx
<Icon size={16} strokeWidth={1.5} />
// Default: 16-20px, strokeWidth 1.5
// Inside icon containers: 20-24px
// Never chunky (strokeWidth 2+) — this is a precision aesthetic
```

---

## What Never To Do
- Never use font-weight 700 or 800 — 600 semibold is the maximum
- Never serif fonts anywhere in this skill
- Never all-caps for body text or headings (only eyebrow labels)
- Never gradient text below 2xl size — it loses definition
- Never animated shimmer on more than one phrase per section
