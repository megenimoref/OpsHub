// LINEAR MODERN SKILL — Spinner.jsx
//
// WHY THIS LOOKS THE WAY IT DOES:
// The spinner in this system is a thin arc — not a filled circle, not dots.
// A thin rotating arc communicates "precision in progress." It matches the
// aesthetic of macOS and Linear's own loading indicators — understated,
// technical, invisible enough to not disrupt the interface.
//
// The arc uses the accent color on one side and transparent on the other,
// creating a graceful gradient fade as it rotates. Combined with linear
// rotation timing, it feels smooth and mechanical.
//
// The progress bar is a thin track — 2px height — with an accent-colored
// fill and a glow emanating from the lead edge. The glow makes the bar feel
// like a lit indicator rather than a colored rectangle.

export function Spinner({ size = "md", color = "#5E6AD2", label }) {
  const sizes = {
    sm: { ring: 16, stroke: 1.5 },
    md: { ring: 24, stroke: 2 },
    lg: { ring: 36, stroke: 2.5 },
    xl: { ring: 48, stroke: 3 },
  };
  const s = sizes[size] || sizes.md;

  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      fontFamily: "Inter, system-ui, sans-serif",
    }}>
      {/* Thin arc spinner — accent on one end, transparent on the other */}
      <svg
        width={s.ring}
        height={s.ring}
        viewBox={`0 0 ${s.ring} ${s.ring}`}
        style={{ animation: "lm-spin 800ms linear infinite", flexShrink: 0 }}
      >
        <circle
          cx={s.ring / 2}
          cy={s.ring / 2}
          r={(s.ring / 2) - s.stroke}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={s.stroke}
        />
        <circle
          cx={s.ring / 2}
          cy={s.ring / 2}
          r={(s.ring / 2) - s.stroke}
          fill="none"
          stroke={color}
          strokeWidth={s.stroke}
          strokeLinecap="round"
          strokeDasharray={`${Math.PI * (s.ring - s.stroke * 2) * 0.75} ${Math.PI * (s.ring - s.stroke * 2) * 0.25}`}
          strokeDashoffset={Math.PI * (s.ring - s.stroke * 2) * 0.25}
        />
      </svg>

      {label && (
        <span style={{
          fontSize: 13,
          color: "#8A8F98",
          fontWeight: 400,
          letterSpacing: "-0.01em",
        }}>
          {label}
        </span>
      )}

      <style>{`
        @keyframes lm-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ── PROGRESS BAR ─────────────────────────────────────────────────────────────

export function ProgressBar({
  value = 0,
  label,
  showPercent = true,
  color = "#5E6AD2",
  size = "md",
}) {
  const heights = { sm: 2, md: 4, lg: 6 };
  const h = heights[size] || heights.md;

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      {(label || showPercent) && (
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}>
          {label && (
            <span style={{
              fontSize: 12, fontWeight: 500,
              color: "#8A8F98", letterSpacing: "0.01em",
            }}>
              {label}
            </span>
          )}
          {showPercent && (
            <span style={{
              fontSize: 12, fontWeight: 500,
              color: "#EDEDEF", letterSpacing: "-0.01em",
              fontVariantNumeric: "tabular-nums",
            }}>
              {value}%
            </span>
          )}
        </div>
      )}

      {/* Track */}
      <div style={{
        height: h,
        background: "rgba(255,255,255,0.06)",
        borderRadius: 9999,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.04)",
      }}>
        {/* Fill with glow at leading edge */}
        <div style={{
          height: "100%",
          width: `${value}%`,
          borderRadius: 9999,
          background: `linear-gradient(to right, ${color}cc, ${color})`,
          // WHY: Glow at the lead edge — the progress bar "emits light"
          boxShadow: `0 0 8px ${color}80`,
          transition: "width 500ms cubic-bezier(0.16, 1, 0.3, 1)",
        }} />
      </div>
    </div>
  );
}

// ── SKELETON ──────────────────────────────────────────────────────────────────

export function Skeleton({ width = "100%", height = 16, borderRadius = 6 }) {
  return (
    <div style={{
      width, height, borderRadius,
      background: "rgba(255,255,255,0.06)",
      animation: "lm-skeleton 1.5s ease-in-out infinite",
    }}>
      <style>{`
        @keyframes lm-skeleton {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ── USAGE EXAMPLES ────────────────────────────────────────────────────────────
// <Spinner size="md" />
// <Spinner size="lg" label="Deploying..." />
// <Spinner size="sm" color="#34d399" />
//
// <ProgressBar value={72} label="Upload" />
// <ProgressBar value={100} color="#34d399" size="sm" />
//
// <Skeleton width={200} height={14} />
// <Skeleton width="100%" height={80} borderRadius={12} />
