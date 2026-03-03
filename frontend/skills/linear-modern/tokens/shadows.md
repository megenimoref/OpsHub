# TOKENS — SHADOWS & GLOW SYSTEM

## The Core Rule: Always Three Layers

Single-layer shadows look flat and template-like.
This skill uses minimum 3 shadow layers on every elevated surface.

```
Layer 1: Border highlight  — 1px white at 6-10% opacity (top edge catches ambient light)
Layer 2: Soft diffuse      — large spread, dark rgba, simulates ambient occlusion
Layer 3: Accent glow       — accent color at 10-30% opacity (for CTAs and featured elements)
```

Each layer contributes something distinct. Together they create genuine
three-dimensional presence — the surface appears to float in space.

---

## Shadow Scale

### Standard Card (default)
```css
box-shadow:
  0 0 0 1px rgba(255,255,255,0.06),   /* Layer 1: border highlight */
  0 2px 20px rgba(0,0,0,0.4),          /* Layer 2: soft diffuse */
  0 0 40px rgba(0,0,0,0.2);            /* Layer 3: ambient darkness */
```

### Standard Card (hover)
```css
box-shadow:
  0 0 0 1px rgba(255,255,255,0.10),    /* Layer 1: brightened */
  0 8px 40px rgba(0,0,0,0.5),          /* Layer 2: increased depth */
  0 0 80px rgba(94,106,210,0.10);      /* Layer 3: accent ambient */
```

### Accent CTA Button
```css
box-shadow:
  0 0 0 1px rgba(94,106,210,0.5),      /* Layer 1: accent border highlight */
  0 4px 12px rgba(94,106,210,0.3),     /* Layer 2: accent diffuse glow */
  inset 0 1px 0 rgba(255,255,255,0.2); /* Layer 3: inner top highlight */
```

### Accent CTA Button (hover)
```css
box-shadow:
  0 0 0 1px rgba(94,106,210,0.7),
  0 8px 24px rgba(94,106,210,0.4),
  0 0 40px rgba(94,106,210,0.2),
  inset 0 1px 0 rgba(255,255,255,0.2);
```

### Secondary Button
```css
box-shadow:
  inset 0 1px 0 rgba(255,255,255,0.1), /* Top highlight */
  0 0 0 1px rgba(255,255,255,0.06),    /* Border */
  0 4px 16px rgba(0,0,0,0.3);          /* Depth */
```

### Elevated Modal / Panel
```css
box-shadow:
  0 0 0 1px rgba(255,255,255,0.08),
  0 16px 70px rgba(0,0,0,0.7),
  0 0 100px rgba(94,106,210,0.05);
```

### Input Focus Ring
```css
box-shadow:
  0 0 0 2px #050506,                   /* Offset gap matches background */
  0 0 0 4px rgba(94,106,210,0.5);      /* Accent ring */
```

---

## The Mouse-Tracking Spotlight

The spotlight effect makes cards feel interactive and alive.
A radial gradient centered on mouse position follows the cursor across the card.

```jsx
// Implementation pattern
const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
const [isHovered, setIsHovered] = useState(false);

const handleMouseMove = (e) => {
  const rect = e.currentTarget.getBoundingClientRect();
  setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
};

// Applied as background overlay
const spotlightStyle = isHovered ? {
  background: `radial-gradient(300px circle at ${mousePos.x}px ${mousePos.y}px,
    rgba(94,106,210,0.15) 0%,
    transparent 70%)`,
} : {};
```

**Spotlight specs:**
- Diameter: 300px circle
- Color: accent at 15% opacity
- Falloff: transparent at 70% radius
- Only visible on hover
- Opacity transition: 0 → 1 over 200ms

---

## Animated Gradient Border

Cards on hover can show an animated gradient border — this is the premium effect
that differentiates this skill from standard dark UI:

```css
/* Gradient border using mask technique */
.gradient-border {
  background: linear-gradient(to bottom, rgba(94,106,210,0.4), transparent);
  padding: 1px;
  border-radius: 16px;
}

/* Or using ::before pseudo-element */
.card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(
    135deg,
    rgba(255,255,255,0.15),
    rgba(94,106,210,0.3),
    transparent 50%
  );
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 300ms ease;
}
.card:hover::before { opacity: 1; }
```

---

## Rules

1. **Always three layers** — never a single `box-shadow` value on elevated elements.
2. **Inner highlight on buttons** — `inset 0 1px 0 rgba(255,255,255,0.1)` on every button.
3. **Accent glow only on accent elements** — not on standard cards at rest.
4. **Hover increases glow** — shadow should visibly intensify on hover.
5. **No drop shadows without blur** — hard offset shadows don't belong in this skill.
6. **Background-matching offset for focus rings** — `0 0 0 2px #050506` before the ring.
