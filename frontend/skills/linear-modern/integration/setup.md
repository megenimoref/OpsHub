# SETUP — LINEAR MODERN SKILL

## 1. Install Dependencies

```bash
npm install framer-motion lucide-react
```

---

## 2. Wire Up Tailwind Config

Merge the `theme.extend` block from `integration/tailwind.config.js`
into your project's `tailwind.config.js`.

Key additions:
- `lm.*` color tokens
- `shadow-card`, `shadow-btn-accent`, `shadow-panel` etc.
- `animate-blob-float`, `animate-shimmer`, `animate-fade-up`
- `ease-expo-out` transition timing
- Extended `8xl` / `9xl` font sizes with negative letter-spacing

---

## 3. Import globals.css

**Next.js (App Router):**
```js
import '@/skills/linear-modern/integration/globals.css'
```

**Next.js (Pages Router):**
```js
import '../skills/linear-modern/integration/globals.css'
```

**Vite / CRA:**
```js
import './skills/linear-modern/integration/globals.css'
```

---

## 4. Add the Background System to Your Root Layout

The background requires the blob layer and canvas wrapper.
Wrap your entire app content with this structure:

```jsx
// layout.jsx or App.jsx
export default function Layout({ children }) {
  return (
    <div className="bg-canvas">
      {/* Layer 3: Animated blobs */}
      <div className="blob-container">
        <div className="blob blob-primary" />
        <div className="blob blob-secondary" />
        <div className="blob blob-tertiary" />
        <div className="blob blob-bottom" />
      </div>
      {/* All content sits above blobs */}
      <div className="content-layer">
        {children}
      </div>
    </div>
  )
}
```

The `::before` (noise) and `::after` (grid) layers are applied automatically
via the `.bg-canvas` class in globals.css.

---

## 5. Verify Setup

```jsx
export default function SkillTest() {
  return (
    <div className="bg-canvas min-h-screen">
      <div className="blob-container">
        <div className="blob blob-primary" />
      </div>
      <div className="content-layer flex items-center justify-center min-h-screen">
        <div>
          <h1 className="text-gradient text-7xl font-semibold tracking-tighter mb-6">
            Linear Modern
          </h1>
          <button style={{
            background: "#5E6AD2",
            color: "#fff",
            padding: "12px 24px",
            borderRadius: 8,
            fontFamily: "Inter, sans-serif",
            fontWeight: 500,
            fontSize: 14,
            boxShadow: "0 0 0 1px rgba(94,106,210,0.5), 0 4px 12px rgba(94,106,210,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
            cursor: "pointer",
            border: "none",
          }}>
            Get started
          </button>
        </div>
      </div>
    </div>
  )
}
```

You should see:
- Deep near-black background (not pure black)
- A soft indigo glow pool from the blob
- Gradient text on the headline (fades to 70% at bottom)
- Glowing indigo button with inner highlight
- Subtle noise texture and grid overlay

---

## 6. Folder Location

```
your-project/
└── skills/
    └── linear-modern/
```
