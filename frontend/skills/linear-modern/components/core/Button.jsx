// LINEAR MODERN SKILL — Button.jsx
//
// WHY THIS LOOKS THE WAY IT DOES:
// The primary (accent) button is the most important interactive element in this system.
// It glows. This is non-negotiable. A flat indigo button looks wrong in this skill
// because every other surface has ambient depth and light. A flat button breaks the
// atmospheric illusion.
//
// The 3-layer shadow on the accent button:
// Layer 1: Accent-colored ring (defines the edge in a glowing way)
// Layer 2: Accent diffuse below the button (casts light on the surface beneath)
// Layer 3: Inner top highlight (catches ambient light from above)
//
// On hover, the button brightens AND the glow increases — it feels like turning
// up the light source. The movement is a subtle scale(0.98) on press only —
// never on hover. Hover is about light, not movement.
//
// Secondary button: glass surface. bg-white/5 at rest, bg-white/8 on hover.
// The inset shadow system handles all border rendering — no explicit border needed.
//
// Ghost button: pure transparency. Text brightens on hover only.

import { useState } from "react";

const EXPO_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";

const variants = {
  primary: {
    rest: {
      background: "#5E6AD2",
      color: "#FFFFFF",
      boxShadow: "0 0 0 1px rgba(94,106,210,0.5), 0 4px 12px rgba(94,106,210,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
    },
    hover: {
      background: "#6872D9",
      boxShadow: "0 0 0 1px rgba(94,106,210,0.7), 0 8px 24px rgba(94,106,210,0.4), 0 0 40px rgba(94,106,210,0.2), inset 0 1px 0 rgba(255,255,255,0.2)",
      transform: "translateY(-1px)",
    },
    active: {
      transform: "scale(0.98)",
      boxShadow: "0 0 0 1px rgba(94,106,210,0.4), 0 2px 8px rgba(94,106,210,0.2), inset 0 1px 0 rgba(255,255,255,0.1)",
    },
  },
  secondary: {
    rest: {
      background: "rgba(255,255,255,0.05)",
      color: "#EDEDEF",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), 0 0 0 1px rgba(255,255,255,0.06), 0 4px 16px rgba(0,0,0,0.3)",
    },
    hover: {
      background: "rgba(255,255,255,0.08)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15), 0 0 0 1px rgba(255,255,255,0.10), 0 4px 20px rgba(0,0,0,0.4)",
      transform: "translateY(-1px)",
    },
    active: {
      transform: "scale(0.98)",
      background: "rgba(255,255,255,0.04)",
    },
  },
  ghost: {
    rest: {
      background: "transparent",
      color: "#8A8F98",
      boxShadow: "none",
    },
    hover: {
      background: "rgba(255,255,255,0.05)",
      color: "#EDEDEF",
      boxShadow: "none",
    },
    active: {
      background: "rgba(255,255,255,0.03)",
      transform: "scale(0.98)",
    },
  },
};

const sizes = {
  sm: { padding: "8px 16px",  fontSize: "13px", gap: 6,  borderRadius: 6  },
  md: { padding: "10px 20px", fontSize: "14px", gap: 8,  borderRadius: 8  },
  lg: { padding: "12px 28px", fontSize: "15px", gap: 10, borderRadius: 8  },
  xl: { padding: "14px 36px", fontSize: "16px", gap: 12, borderRadius: 10 },
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  icon: Icon,
  iconPosition = "left",
  disabled = false,
  loading = false,
  onClick,
}) {
  const [state, setState] = useState("rest");
  const v = variants[variant] || variants.primary;
  const s = sizes[size];

  const currentStyle =
    state === "hover"  ? { ...v.rest, ...v.hover }  :
    state === "active" ? { ...v.rest, ...v.active } :
    v.rest;

  return (
    <button
      onClick={!disabled && !loading ? onClick : undefined}
      onMouseEnter={() => !disabled && setState("hover")}
      onMouseLeave={() => setState("rest")}
      onMouseDown={() => !disabled && setState("active")}
      onMouseUp={() => setState("hover")}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: s.gap,
        padding: s.padding,
        fontSize: s.fontSize,
        fontFamily: "Inter, system-ui, sans-serif",
        fontWeight: 500,
        letterSpacing: "-0.01em",
        borderRadius: s.borderRadius,
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        userSelect: "none",
        whiteSpace: "nowrap",
        outline: "none",
        transition: `all 200ms ${EXPO_OUT}`,
        ...currentStyle,
      }}
    >
      {loading ? (
        // Minimal spinner — a subtle rotating ring
        <span style={{
          width: 14, height: 14,
          border: "1.5px solid rgba(255,255,255,0.3)",
          borderTop: "1.5px solid #fff",
          borderRadius: "50%",
          animation: "lm-spin 600ms linear infinite",
          flexShrink: 0,
        }} />
      ) : (
        <>
          {Icon && iconPosition === "left" && (
            <Icon size={size === "sm" ? 14 : 16} strokeWidth={1.5} />
          )}
          {children}
          {Icon && iconPosition === "right" && (
            <Icon size={size === "sm" ? 14 : 16} strokeWidth={1.5} />
          )}
        </>
      )}
      <style>{`
        @keyframes lm-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
}

// ── USAGE EXAMPLES ────────────────────────────────────────────────────────────
// <Button variant="primary" size="lg">Get started</Button>
// <Button variant="primary" icon={ArrowRight} iconPosition="right">Start building</Button>
// <Button variant="secondary">Learn more</Button>
// <Button variant="ghost">Cancel</Button>
// <Button loading>Saving...</Button>
// <Button disabled>Unavailable</Button>
