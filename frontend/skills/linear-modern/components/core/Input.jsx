// LINEAR MODERN SKILL — Input.jsx
//
// WHY THIS LOOKS THE WAY IT DOES:
// Inputs in this system use a dark surface background (#0F0F12) — darker than
// the base canvas — so the field feels like a recessed surface. The user
// is typing INTO the interface, not ON it.
//
// The focus state uses the accent glow ring — the same light emission pattern
// as the primary button. The border brightens AND an outer glow appears.
// This creates the impression that the active input is "selected" by the
// ambient lighting system, not just highlighted by a colored ring.
//
// Labels are 12px Inter, slightly muted. They are metadata, not decoration.
// Error messages use the same size with a reddish tint — but never harsh red.

import { useState } from "react";

const EXPO_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";

export function Input({
  label,
  placeholder = "",
  value,
  onChange,
  type = "text",
  error,
  hint,
  disabled = false,
  required = false,
  icon: Icon,
}) {
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? "rgba(239,68,68,0.5)"
    : focused
    ? "#5E6AD2"
    : "rgba(255,255,255,0.10)";

  const focusGlow = focused && !error
    ? "0 0 0 2px #050506, 0 0 0 4px rgba(94,106,210,0.4)"
    : "";

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: 8,
      fontFamily: "Inter, system-ui, sans-serif",
    }}>
      {label && (
        <label style={{
          fontSize: 12,
          fontWeight: 500,
          color: error ? "rgba(239,68,68,0.8)" : "#8A8F98",
          letterSpacing: "0.01em",
        }}>
          {label}{required && <span style={{ color: "#5E6AD2", marginLeft: 3 }}>*</span>}
        </label>
      )}

      <div style={{ position: "relative" }}>
        {Icon && (
          <div style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            color: focused ? "#5E6AD2" : "#8A8F98",
            transition: `color 200ms ${EXPO_OUT}`,
            pointerEvents: "none",
          }}>
            <Icon size={16} strokeWidth={1.5} />
          </div>
        )}

        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: "100%",
            // WHY: Darker than the canvas — recessed surface feel
            background: "#0F0F12",
            border: `1px solid ${borderColor}`,
            borderRadius: 8,
            padding: Icon ? "10px 14px 10px 38px" : "10px 14px",
            fontSize: 14,
            fontFamily: "inherit",
            fontWeight: 400,
            color: "#EDEDEF",
            outline: "none",
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? "not-allowed" : "text",
            boxShadow: focusGlow || "none",
            transition: `border-color 200ms ${EXPO_OUT}, box-shadow 200ms ${EXPO_OUT}`,
          }}
        />
      </div>

      {error && (
        <span style={{ fontSize: 12, color: "rgba(239,68,68,0.8)", letterSpacing: "0.01em" }}>
          {error}
        </span>
      )}
      {hint && !error && (
        <span style={{ fontSize: 12, color: "#8A8F98" }}>{hint}</span>
      )}
    </div>
  );
}

// ── BADGE ─────────────────────────────────────────────────────────────────────
// LINEAR MODERN SKILL — Badge.jsx
//
// WHY THIS LOOKS THE WAY IT DOES:
// Badges are pill-shaped — the only rounded-full elements in this skill.
// WHY: They function as tags and status indicators. The pill shape
// communicates "label" vs "interactive button" (which uses rounded-lg).
//
// The accent badge uses the accent color border at 30% opacity — the
// same "ambient border" technique used throughout the system. The text
// is slightly brighter than muted but not full white — it is a label,
// not primary content.

export function Badge({ children, variant = "default", dot = false }) {
  const variants = {
    default: {
      background: "rgba(255,255,255,0.06)",
      color: "#8A8F98",
      border: "1px solid rgba(255,255,255,0.08)",
    },
    accent: {
      background: "rgba(94,106,210,0.12)",
      color: "#818cf8",
      border: "1px solid rgba(94,106,210,0.30)",
    },
    success: {
      background: "rgba(52,211,153,0.10)",
      color: "#34d399",
      border: "1px solid rgba(52,211,153,0.25)",
    },
    warning: {
      background: "rgba(251,191,36,0.10)",
      color: "#fbbf24",
      border: "1px solid rgba(251,191,36,0.25)",
    },
    error: {
      background: "rgba(239,68,68,0.10)",
      color: "#f87171",
      border: "1px solid rgba(239,68,68,0.25)",
    },
    new: {
      // WHY: "New" badge uses a shimmer gradient — signals novelty
      background: "rgba(94,106,210,0.15)",
      color: "#818cf8",
      border: "1px solid rgba(94,106,210,0.30)",
    },
  };

  const v = variants[variant] || variants.default;

  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      padding: "3px 10px",
      borderRadius: 9999,
      fontSize: 11,
      fontFamily: "Inter, system-ui, sans-serif",
      fontWeight: 500,
      letterSpacing: "0.02em",
      whiteSpace: "nowrap",
      ...v,
    }}>
      {dot && (
        <span style={{
          width: 5, height: 5,
          borderRadius: "50%",
          background: v.color,
          flexShrink: 0,
        }} />
      )}
      {children}
    </span>
  );
}

// ── USAGE EXAMPLES ────────────────────────────────────────────────────────────
// <Input label="Email" type="email" placeholder="you@example.com" required />
// <Input label="Search" icon={Search} placeholder="Search..." />
// <Input label="Password" type="password" error="Password must be 8+ characters" />
// <Input hint="We'll never share your email" />
//
// <Badge variant="accent">Beta</Badge>
// <Badge variant="new" dot>New</Badge>
// <Badge variant="success" dot>Active</Badge>
// <Badge variant="warning">Degraded</Badge>
// <Badge variant="error" dot>Offline</Badge>
