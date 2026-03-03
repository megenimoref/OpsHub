# PHILOSOPHY — LINEAR MODERN

## The Reference World

Open Linear at 11pm. The deep near-black canvas with soft pools of indigo light.
The instant, precise hover states. The way cards seem to float in space with
multiple shadow layers creating genuine depth. The subtle grid overlay that says
"this was crafted by engineers who also care about aesthetics."

That is this skill. It is the design language of the best developer tools
of the 2020s — Linear, Vercel, Raycast, Loom, Figma's dark mode. Products where
the design communicates "we are obsessive about every detail."

---

## Core Principles

### 1. Background Is Never Flat
The most common mistake with dark interfaces is using a solid `#000000` or `#1a1a1a`.
This immediately looks amateur.

The background in this system is a composition of four layers:
- A radial gradient from near-black to deep-black
- A noise texture at 1.5% opacity for tactile paper-like quality
- Animated gradient blobs (900-1400px, heavily blurred) for cinematic light pools
- A 64px grid overlay at 2% opacity for technical precision

Together these create genuine atmospheric depth. Separately, each is invisible.
Together, they make the interface feel like looking through frosted glass into
a premium application running at night.

### 2. The Glow Is the Accent Color's Job
Most design systems use the accent color for fills, borders, and text.
This system uses the accent color (`#5E6AD2` indigo) primarily as light.

Buttons glow. Cards near the cursor glow. The background blobs are the accent color
at 25% opacity and 150px blur. The accent is not applied — it is emitted.

This creates the "ambient lighting" effect. The interface feels illuminated from within.

### 3. Shadows Are Always Layered
Single-layer shadows look flat and 2012. This skill uses minimum 3 layers:

```
Layer 1: Border highlight — 1px white at 6-10% opacity (top edge light catch)
Layer 2: Soft diffuse shadow — large spread, dark, simulates ambient occlusion
Layer 3: Optional accent glow — accent color at 10-30% opacity for CTAs
```

Each layer contributes something a single shadow cannot. The combination creates
the floating, three-dimensional quality that defines premium software interfaces.

### 4. Motion Is Precise, Not Playful
The animation easing is `cubic-bezier(0.16, 1, 0.3, 1)` — expo-out.
Fast exit from rest, then decelerating smoothly to the target position.

This is the opposite of bounce or spring physics. It feels decisive and controlled,
like a mechanical component settling into place. An element that bounces feels playful.
An element that decelerates with expo-out feels engineered.

Duration: 200-300ms maximum. The fastest interactions (hover state changes) are
100-150ms. Nothing in this design is slow. The speed communicates responsiveness.

### 5. Mouse Tracking Makes It Feel Alive
Static interfaces feel like images. Interactive interfaces feel like software.

The mouse-tracking spotlight — a radial gradient that follows the cursor across
cards at 15% opacity — is the single most effective technique for making a web
interface feel like a native desktop application. It creates the impression that
the surface is responding to presence, not just clicks.

This is the "magical" quality of premium interfaces. It is always subtle.
It is never the first thing you notice. It is immediately missed when removed.

### 6. Bento Grids Must Be Asymmetric
Uniform card grids are a telltale sign of template design. When every card is
the same size, the layout says "I filled a container."

Asymmetric bento grids say "I thought about information hierarchy." A hero card
spanning 4 of 6 columns communicates primary importance. Smaller adjacent cards
communicate secondary details. The size relationship is semantic, not decorative.

---

## Visual References
- Linear.app (the definitive reference)
- Vercel.com dark mode
- Raycast.com landing page
- Loom.com interface
- Figma's dark theme
- Notion AI interface
- Blade Runner 2049 visual palette (cinematic depth reference)
- macOS dark mode system (precision reference)

---

## What Breaks This Aesthetic

| ❌ WRONG | ✓ RIGHT |
|---|---|
| Pure `#000000` background | Near-black `#050506` or `#020203` |
| Flat solid background | 4-layer: gradient + noise + blobs + grid |
| Single-layer shadow | 3-layer: border + diffuse + glow |
| Prominent borders (`1px white`) | Near-invisible borders (6% white opacity) |
| Colorful accent overuse | Accent as light source, not fill |
| Spring/bounce animations | Expo-out `[0.16, 1, 0.3, 1]` |
| Slow animations (500ms+) | Fast and precise (200-300ms) |
| Large hover movements (20px+) | Subtle movements (4-8px max) |
| Uniform bento grid | Asymmetric sizes communicating hierarchy |
| Pure white text `#FFFFFF` | Off-white foreground `#EDEDEF` |
| Missing gradient text | Display headlines use white gradient fill |
| Flat indigo button | Indigo button with 3-layer glow shadow |

---

## Tone of Copy & Labels

This system pairs with copy that is confident, technical, and concise.

- Headlines are declarative: "Build faster. Ship better." not "Are you ready to build faster?"
- Section labels use sentence case with monospace: `feat. 01` or `// overview`
- CTAs are specific: "Start building" not "Get started"
- Error states are technical: "Request failed — try again" not "Oops!"
- Empty states are dry and functional: "No results" not "Nothing here yet 🙁"

The interface is crafted for developers. The copy respects their time.
