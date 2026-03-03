/** @type {import('tailwindcss').Config} */

// LINEAR MODERN SKILL — Tailwind Config Extension
// Merge theme.extend into your existing tailwind.config.js

module.exports = {
  theme: {
    extend: {
      // ── COLORS ──────────────────────────────────────────────────────────────
      colors: {
        lm: {
          // Backgrounds
          "bg-deep":      "#020203",
          "bg-base":      "#050506",
          "bg-elevated":  "#0a0a0c",

          // Text
          fg:             "#EDEDEF",
          "fg-muted":     "#8A8F98",

          // Accent
          accent:         "#5E6AD2",
          "accent-bright":"#6872D9",
        },
      },

      // ── FONTS ────────────────────────────────────────────────────────────────
      fontFamily: {
        sans: ["Inter", "Geist Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },

      // ── FONT SIZES — Display sizes ────────────────────────────────────────
      fontSize: {
        "8xl": ["8rem",  { lineHeight: "1",    letterSpacing: "-0.04em" }],
        "9xl": ["10rem", { lineHeight: "0.95", letterSpacing: "-0.05em" }],
      },

      // ── LETTER SPACING ───────────────────────────────────────────────────────
      letterSpacing: {
        tighter: "-0.03em",
        tight:   "-0.025em",
        normal:  "0em",
        wide:    "0.05em",
        wider:   "0.08em",
        widest:  "0.12em",
      },

      // ── BORDER RADIUS ────────────────────────────────────────────────────────
      borderRadius: {
        sm:    "6px",
        md:    "8px",
        lg:    "8px",
        xl:    "12px",
        "2xl": "16px",
        "3xl": "20px",
        full:  "9999px",
      },

      // ── BOX SHADOWS ──────────────────────────────────────────────────────────
      boxShadow: {
        // Card shadows
        "card":
          "0 0 0 1px rgba(255,255,255,0.06), 0 2px 20px rgba(0,0,0,0.4), 0 0 40px rgba(0,0,0,0.2)",
        "card-hover":
          "0 0 0 1px rgba(255,255,255,0.10), 0 8px 40px rgba(0,0,0,0.5), 0 0 80px rgba(94,106,210,0.10)",

        // Button shadows
        "btn-accent":
          "0 0 0 1px rgba(94,106,210,0.5), 0 4px 12px rgba(94,106,210,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
        "btn-accent-hover":
          "0 0 0 1px rgba(94,106,210,0.7), 0 8px 24px rgba(94,106,210,0.4), 0 0 40px rgba(94,106,210,0.2), inset 0 1px 0 rgba(255,255,255,0.2)",
        "btn-secondary":
          "inset 0 1px 0 rgba(255,255,255,0.1), 0 0 0 1px rgba(255,255,255,0.06), 0 4px 16px rgba(0,0,0,0.3)",

        // Elevated panel
        "panel":
          "0 0 0 1px rgba(255,255,255,0.08), 0 16px 70px rgba(0,0,0,0.7), 0 0 100px rgba(94,106,210,0.05)",

        // Focus ring (applied via ring utilities)
        "focus":
          "0 0 0 2px #050506, 0 0 0 4px rgba(94,106,210,0.5)",
      },

      // ── ANIMATIONS ───────────────────────────────────────────────────────────
      animation: {
        "blob-float":  "blob-float 10s ease-in-out infinite",
        "blob-pulse":  "blob-pulse 4s ease-in-out infinite",
        "shimmer":     "shimmer 3s linear infinite",
        "fade-up":     "fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both",
        "scale-in":    "scaleIn 0.6s cubic-bezier(0.16,1,0.3,1) both",
      },

      keyframes: {
        "blob-float": {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "33%":       { transform: "translateY(-20px) rotate(1deg)" },
          "66%":       { transform: "translateY(10px) rotate(-0.5deg)" },
        },
        "blob-pulse": {
          "0%, 100%": { opacity: "0.10", transform: "scale(1)" },
          "50%":       { opacity: "0.15", transform: "scale(1.05)" },
        },
        shimmer: {
          from: { backgroundPosition: "0% center" },
          to:   { backgroundPosition: "200% center" },
        },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(24px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.95)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
      },

      // ── TRANSITION TIMING ────────────────────────────────────────────────────
      transitionTimingFunction: {
        "expo-out": "cubic-bezier(0.16, 1, 0.3, 1)",
      },

      transitionDuration: {
        "200": "200ms",
        "300": "300ms",
        "600": "600ms",
      },

      // ── BACKDROP BLUR ────────────────────────────────────────────────────────
      backdropBlur: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        xl: "20px",
      },
    },
  },
  plugins: [],
};
