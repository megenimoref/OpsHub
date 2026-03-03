// LINEAR MODERN SKILL — Card.jsx
//
// WHY THIS LOOKS THE WAY IT DOES:
// Cards are glass surfaces — they use a translucent gradient background
// (white/8 → white/2) rather than a flat dark color. This creates the
// impression the card is frosted glass hovering over the background.
//
// The 3-layer shadow system creates genuine depth:
// - Layer 1 (border highlight): 1px white at 6% opacity — light catch on edge
// - Layer 2 (soft diffuse): large dark shadow — ambient occlusion
// - Layer 3 (accent glow on hover): accent at 10% — the light source responds
//
// Mouse-tracking spotlight: a radial gradient follows the cursor across
// the card surface. At 12% opacity it is barely visible — but immediately
// missed when removed. This is the "magical" quality of premium interfaces.
//
// The gradient border that fades in on hover uses the mask-composite technique.
// It creates a glowing edge that communicates "this surface is selected by light."

import { useState, useRef } from "react";

const EXPO_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";

export function Card({
  children,
  variant = "default",
  interactive = false,
  spotlight = false,   // mouse-tracking light effect
  gradientBorder = false, // animated gradient border on hover
  padding = "24px",
  style: externalStyle,
  onClick,
}) {
  const [hovered, setHovered] = useState(false);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const ref = useRef(null);

  const handleMouseMove = (e) => {
    if (!spotlight || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const variants = {
    default: {
      rest: {
        background: "linear-gradient(to bottom, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 2px 20px rgba(0,0,0,0.4), 0 0 40px rgba(0,0,0,0.2)",
      },
      hover: {
        boxShadow: "0 0 0 1px rgba(255,255,255,0.10), 0 8px 40px rgba(0,0,0,0.5), 0 0 80px rgba(94,106,210,0.10)",
        transform: "translateY(-4px)",
      },
    },
    glass: {
      rest: {
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.5)",
      },
      hover: {
        boxShadow: "0 0 0 1px rgba(255,255,255,0.10), 0 8px 40px rgba(0,0,0,0.6)",
        transform: "translateY(-2px)",
      },
    },
    elevated: {
      rest: {
        background: "#0a0a0c",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 16px 70px rgba(0,0,0,0.7)",
      },
      hover: {
        boxShadow: "0 0 0 1px rgba(255,255,255,0.12), 0 20px 80px rgba(0,0,0,0.8), 0 0 60px rgba(94,106,210,0.08)",
        transform: "translateY(-4px)",
      },
    },
  };

  const v = variants[variant] || variants.default;
  const currentStyle = interactive && hovered ? { ...v.rest, ...v.hover } : v.rest;

  return (
    <div
      ref={ref}
      onClick={onClick}
      onMouseEnter={() => { setHovered(true); }}
      onMouseLeave={() => { setHovered(false); }}
      onMouseMove={handleMouseMove}
      style={{
        position: "relative",
        borderRadius: 16,
        padding,
        overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        transition: interactive
          ? `transform 300ms ${EXPO_OUT}, box-shadow 300ms ${EXPO_OUT}`
          : "none",
        ...currentStyle,
        ...externalStyle,
      }}
    >
      {/* Mouse-tracking spotlight overlay */}
      {spotlight && (
        <div style={{
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          background: hovered
            ? `radial-gradient(300px circle at ${mouse.x}px ${mouse.y}px, rgba(94,106,210,0.12), transparent 70%)`
            : "none",
          opacity: hovered ? 1 : 0,
          transition: `opacity 200ms ${EXPO_OUT}`,
          pointerEvents: "none",
          zIndex: 0,
        }} />
      )}

      {/* Gradient border overlay on hover */}
      {gradientBorder && (
        <div style={{
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          padding: 1,
          background: "linear-gradient(135deg, rgba(255,255,255,0.15), rgba(94,106,210,0.3), transparent 60%)",
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          opacity: hovered ? 1 : 0,
          transition: `opacity 300ms ${EXPO_OUT}`,
          pointerEvents: "none",
          zIndex: 0,
        }} />
      )}

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}

// ── ALERT ─────────────────────────────────────────────────────────────────────
// LINEAR MODERN SKILL — Alert.jsx
//
// WHY THIS LOOKS THE WAY IT DOES:
// Alerts follow the same glass surface system as cards but with semantic
// color tints at very low opacity. The left border accent provides
// semantic meaning without screaming. The icon sits in a small
// rounded container — an icon container, not a circle — matching
// the rounded-xl pattern used elsewhere in the system.
//
// Note: Colors are used as ambient tints, not dominant fills.
// An error alert is mostly dark surface with a subtle red left border
// and 10% red background — not a bright red box.

export function Alert({ type = "info", title, children, onDismiss }) {
  const types = {
    info: {
      bg: "rgba(94,106,210,0.08)",
      border: "rgba(94,106,210,0.25)",
      left: "#5E6AD2",
      iconBg: "rgba(94,106,210,0.15)",
      iconColor: "#818cf8",
    },
    success: {
      bg: "rgba(52,211,153,0.06)",
      border: "rgba(52,211,153,0.20)",
      left: "#34d399",
      iconBg: "rgba(52,211,153,0.12)",
      iconColor: "#34d399",
    },
    warning: {
      bg: "rgba(251,191,36,0.06)",
      border: "rgba(251,191,36,0.20)",
      left: "#fbbf24",
      iconBg: "rgba(251,191,36,0.12)",
      iconColor: "#fbbf24",
    },
    error: {
      bg: "rgba(239,68,68,0.06)",
      border: "rgba(239,68,68,0.20)",
      left: "#f87171",
      iconBg: "rgba(239,68,68,0.12)",
      iconColor: "#f87171",
    },
  };

  const t = types[type] || types.info;

  return (
    <div style={{
      display: "flex",
      gap: 12,
      padding: "14px 16px",
      borderRadius: 12,
      background: t.bg,
      border: `1px solid ${t.border}`,
      borderLeft: `3px solid ${t.left}`,
      boxShadow: "0 0 0 1px rgba(255,255,255,0.04)",
      fontFamily: "Inter, system-ui, sans-serif",
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: t.iconBg,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
        fontSize: 14,
        color: t.iconColor,
        fontWeight: 600,
      }}>
        {type === "info" && "i"}
        {type === "success" && "✓"}
        {type === "warning" && "!"}
        {type === "error" && "✕"}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {title && (
          <div style={{
            fontSize: 13, fontWeight: 500, color: "#EDEDEF",
            marginBottom: children ? 4 : 0,
          }}>
            {title}
          </div>
        )}
        {children && (
          <div style={{ fontSize: 13, color: "#8A8F98", lineHeight: 1.5 }}>
            {children}
          </div>
        )}
      </div>

      {onDismiss && (
        <button onClick={onDismiss} style={{
          background: "none", border: "none", padding: 4,
          color: "#8A8F98", cursor: "pointer", fontSize: 16,
          lineHeight: 1, borderRadius: 4, flexShrink: 0,
          transition: "color 150ms ease",
        }}>×</button>
      )}
    </div>
  );
}

// ── USAGE EXAMPLES ────────────────────────────────────────────────────────────
// <Card interactive spotlight gradientBorder>Content here</Card>
// <Card variant="glass">Glass morphism surface</Card>
// <Card variant="elevated" padding="32px">Deep elevated panel</Card>
//
// <Alert type="info" title="New update available">Version 2.1.0 is ready.</Alert>
// <Alert type="success" title="Deployed successfully">Your changes are live.</Alert>
// <Alert type="warning" title="Rate limit approaching">80% of quota used.</Alert>
// <Alert type="error" title="Build failed" onDismiss={() => {}}>Check the logs.</Alert>
