// LINEAR MODERN SKILL — LandingPage.jsx
// THE NORTH STAR EXAMPLE
//
// What to notice:
// - 4-layer background: radial gradient + noise + animated blobs + grid overlay
// - Gradient text on all large headlines (white fading to 70% opacity)
// - Accent shimmer text on key phrases
// - Frosted glass navbar with backdrop-blur
// - Asymmetric bento grid for features — NOT uniform cards
// - Mouse-tracking spotlight on feature cards
// - Gradient border on hover for feature cards
// - Multi-layer shadows on all elevated surfaces
// - Stats section: glowing accent numbers, muted labels
// - Pricing: glowing featured card with accent glow border
// - All animations: 200-300ms, expo-out easing [0.16, 1, 0.3, 1]
// - Zero bouncy/spring animations — precision only
// - Section dividers: gradient lines (transparent → visible → transparent)

import { useState, useRef, useEffect } from "react";
import { ArrowRight, Zap, Shield, BarChart, Palette, Code, Globe, Check } from "lucide-react";

// ── TOKENS ────────────────────────────────────────────────────────────────────
const t = {
  bgBase:     "#050506",
  bgDeep:     "#020203",
  bgElevated: "#0a0a0c",
  fg:         "#EDEDEF",
  fgMuted:    "#8A8F98",
  accent:     "#5E6AD2",
  accentBright:"#6872D9",
  surface:    "rgba(255,255,255,0.05)",
  surfaceHov: "rgba(255,255,255,0.08)",
  border:     "rgba(255,255,255,0.06)",
  borderHov:  "rgba(255,255,255,0.10)",
};

const EXPO = "cubic-bezier(0.16, 1, 0.3, 1)";

// ── GLOBAL STYLES ─────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Inter", system-ui, sans-serif; background: #050506; color: #EDEDEF; -webkit-font-smoothing: antialiased; overflow-x: hidden; }
  ::selection { background: rgba(94,106,210,0.35); color: #EDEDEF; }
  ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #020203; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }

  .text-gradient {
    background: linear-gradient(to bottom, #ffffff 0%, rgba(255,255,255,0.95) 40%, rgba(255,255,255,0.70) 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  }
  .text-shimmer {
    background: linear-gradient(to right, #5E6AD2, #818cf8, #5E6AD2);
    background-size: 200% auto;
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    animation: shimmer 3s linear infinite;
  }
  @keyframes shimmer { from { background-position: 0% center; } to { background-position: 200% center; } }
  @keyframes blob-float { 0%,100%{transform:translateY(0) rotate(0deg)} 33%{transform:translateY(-20px) rotate(1deg)} 66%{transform:translateY(10px) rotate(-0.5deg)} }
  @keyframes blob-float-c { 0%,100%{transform:translateX(-50%) translateY(0)} 50%{transform:translateX(-50%) translateY(-20px)} }
  @keyframes blob-pulse { 0%,100%{opacity:0.10;transform:translateX(-50%) scale(1)} 50%{opacity:0.15;transform:translateX(-50%) scale(1.05)} }
  @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
  @keyframes scaleIn { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
  @keyframes lm-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
`;

// ── BACKGROUND SYSTEM ─────────────────────────────────────────────────────────
function Background() {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      {/* Layer 1: Radial gradient base */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at top, #0a0a0f 0%, #050506 50%, #020203 100%)",
      }} />

      {/* Layer 2: Noise texture */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.015,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }} />

      {/* Layer 3: Animated blobs */}
      {/* Primary — top center, large indigo */}
      <div style={{
        position: "absolute", width: 900, height: 700, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(94,106,210,0.25) 0%, transparent 70%)",
        filter: "blur(120px)", top: -200, left: "50%",
        animation: "blob-float-c 10s ease-in-out infinite",
      }} />
      {/* Secondary — left, purple/pink */}
      <div style={{
        position: "absolute", width: 600, height: 800, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, rgba(236,72,153,0.08) 50%, transparent 70%)",
        filter: "blur(100px)", top: "20%", left: -100,
        animation: "blob-float 8s ease-in-out 2s infinite",
      }} />
      {/* Tertiary — right, blue */}
      <div style={{
        position: "absolute", width: 500, height: 700, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(79,70,229,0.10) 0%, rgba(59,130,246,0.08) 50%, transparent 70%)",
        filter: "blur(90px)", top: "30%", right: -80,
        animation: "blob-float 12s ease-in-out 1s infinite",
      }} />
      {/* Bottom pulse */}
      <div style={{
        position: "absolute", width: 600, height: 400, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(94,106,210,0.10) 0%, transparent 70%)",
        filter: "blur(80px)", bottom: -100, left: "50%",
        animation: "blob-pulse 4s ease-in-out infinite",
      }} />

      {/* Layer 4: Grid overlay */}
      <div style={{
        position: "absolute", inset: 0, opacity: 1,
        backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
        backgroundSize: "64px 64px",
      }} />
    </div>
  );
}

// ── SECTION DIVIDER ───────────────────────────────────────────────────────────
const Divider = () => (
  <div style={{
    height: 1,
    background: "linear-gradient(to right, transparent, rgba(255,255,255,0.08) 30%, rgba(255,255,255,0.08) 70%, transparent)",
    margin: "0",
  }} />
);

// ── ACCENT BUTTON ─────────────────────────────────────────────────────────────
function AccentBtn({ children, icon: Icon, variant = "primary", onClick }) {
  const [h, setH] = useState(false);
  const [a, setA] = useState(false);

  const styles = {
    primary: {
      bg: h ? "#6872D9" : "#5E6AD2",
      shadow: h
        ? "0 0 0 1px rgba(94,106,210,0.7), 0 8px 24px rgba(94,106,210,0.4), 0 0 40px rgba(94,106,210,0.2), inset 0 1px 0 rgba(255,255,255,0.2)"
        : "0 0 0 1px rgba(94,106,210,0.5), 0 4px 12px rgba(94,106,210,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
      color: "#fff",
    },
    secondary: {
      bg: h ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.05)",
      shadow: h
        ? "inset 0 1px 0 rgba(255,255,255,0.15), 0 0 0 1px rgba(255,255,255,0.10)"
        : "inset 0 1px 0 rgba(255,255,255,0.1), 0 0 0 1px rgba(255,255,255,0.06)",
      color: h ? "#EDEDEF" : "#8A8F98",
    },
  };

  const s = styles[variant];

  return (
    <button
      onMouseEnter={() => setH(true)} onMouseLeave={() => { setH(false); setA(false); }}
      onMouseDown={() => setA(true)} onMouseUp={() => setA(false)}
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "10px 22px", borderRadius: 8, border: "none",
        background: s.bg, color: s.color,
        fontSize: 14, fontWeight: 500, letterSpacing: "-0.01em",
        fontFamily: "Inter, sans-serif",
        boxShadow: s.shadow,
        transform: a ? "scale(0.98)" : h ? "translateY(-1px)" : "none",
        cursor: "pointer", outline: "none", whiteSpace: "nowrap",
        transition: `all 200ms ${EXPO}`,
      }}
    >
      {children}
      {Icon && <Icon size={15} strokeWidth={1.5} />}
    </button>
  );
}

// ── NAV ───────────────────────────────────────────────────────────────────────
function Nav() {
  const [hov, setHov] = useState(null);
  const links = ["Skills", "Docs", "Pricing", "GitHub"];

  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 100,
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      background: "rgba(5,5,6,0.8)",
      borderBottom: `1px solid ${t.border}`,
    }}>
      <div style={{
        maxWidth: 1152, margin: "0 auto", padding: "0 24px",
        height: 60, display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 24, height: 24, borderRadius: 6,
            background: "linear-gradient(135deg, #5E6AD2, #6872D9)",
            boxShadow: "0 0 12px rgba(94,106,210,0.4)", flexShrink: 0,
          }} />
          <span style={{ fontSize: 15, fontWeight: 600, color: t.fg, letterSpacing: "-0.02em" }}>
            Drip
          </span>
        </div>

        <div style={{ display: "flex", gap: 4 }}>
          {links.map((l, i) => (
            <a key={l} href="#"
              onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}
              style={{
                padding: "6px 14px", borderRadius: 6,
                fontSize: 14, fontWeight: hov === i ? 500 : 400,
                color: hov === i ? t.fg : t.fgMuted,
                textDecoration: "none",
                background: hov === i ? t.surfaceHov : "transparent",
                transition: `all 200ms ${EXPO}`,
              }}>{l}</a>
          ))}
        </div>

        <AccentBtn>Start building</AccentBtn>
      </div>
    </nav>
  );
}

// ── HERO ──────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section style={{ padding: "120px 24px 100px", textAlign: "center", maxWidth: 1152, margin: "0 auto" }}>

      {/* Badge */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "5px 14px", borderRadius: 9999, marginBottom: 40,
        background: "rgba(94,106,210,0.12)",
        border: "1px solid rgba(94,106,210,0.30)",
        animation: `fadeUp 0.6s ${EXPO} both`,
      }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#5E6AD2", boxShadow: "0 0 6px rgba(94,106,210,0.8)" }} />
        <span style={{ fontSize: 12, fontWeight: 500, color: "#818cf8", letterSpacing: "0.02em" }}>
          Public Beta — Now Available
        </span>
      </div>

      {/* Headline */}
      <h1 style={{
        fontFamily: "Inter, sans-serif",
        fontSize: "clamp(48px, 8vw, 96px)",
        fontWeight: 600,
        lineHeight: 1.0,
        letterSpacing: "-0.04em",
        marginBottom: 24,
        animation: `fadeUp 0.6s ${EXPO} 0.1s both`,
      }}>
        <span className="text-gradient">Stop shipping</span><br />
        <span className="text-shimmer">generic UIs.</span>
      </h1>

      {/* Sub */}
      <p style={{
        fontSize: "clamp(16px, 2vw, 20px)", color: t.fgMuted,
        maxWidth: 580, margin: "0 auto 48px", lineHeight: 1.7,
        animation: `fadeUp 0.6s ${EXPO} 0.2s both`,
      }}>
        Complete design systems for AI-built projects. One command places a full
        skill folder in your project. Every component your agent builds from
        that moment — today and always — belongs to the same world.
      </p>

      {/* CTAs */}
      <div style={{
        display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap",
        marginBottom: 56, animation: `fadeUp 0.6s ${EXPO} 0.3s both`,
      }}>
        <AccentBtn icon={ArrowRight}>Browse skills</AccentBtn>
        <AccentBtn variant="secondary">Read the docs</AccentBtn>
      </div>

      {/* Command pill */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 0,
        borderRadius: 12, overflow: "hidden",
        border: `1px solid ${t.border}`,
        boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.4)",
        animation: `scaleIn 0.6s ${EXPO} 0.4s both`,
      }}>
        <div style={{
          padding: "12px 16px",
          background: "rgba(94,106,210,0.15)",
          borderRight: `1px solid ${t.border}`,
          fontSize: 12, fontFamily: "JetBrains Mono, monospace",
          color: "#818cf8", fontWeight: 500,
        }}>
          $
        </div>
        <div style={{
          padding: "12px 20px",
          background: "rgba(255,255,255,0.03)",
          fontSize: 13, fontFamily: "JetBrains Mono, monospace",
          color: t.fg, letterSpacing: "0.02em",
        }}>
          npx getdrip add retro-terminal
        </div>
      </div>
    </section>
  );
}

// ── STATS ─────────────────────────────────────────────────────────────────────
function Stats() {
  const stats = [
    { value: "12+", label: "Design skills", suffix: null },
    { value: "15+", label: "Components per skill", suffix: null },
    { value: "1", label: "Command to install", suffix: null },
    { value: "∞", label: "Style consistency", suffix: null },
  ];

  return (
    <>
      <Divider />
      <section style={{ padding: "64px 24px", maxWidth: 1152, margin: "0 auto" }}>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
          gap: 1, background: t.border, border: `1px solid ${t.border}`, borderRadius: 16, overflow: "hidden",
        }}>
          {stats.map((s, i) => (
            <div key={i} style={{
              padding: "40px 32px", textAlign: "center",
              background: t.bgElevated,
            }}>
              <div style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "clamp(36px, 4vw, 56px)",
                fontWeight: 600, letterSpacing: "-0.04em", lineHeight: 1,
                marginBottom: 12,
                // WHY: Gradient text + accent glow creates the "illuminated number" effect
                background: "linear-gradient(to bottom, #ffffff, rgba(255,255,255,0.7))",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>
                {s.value}
              </div>
              <div style={{
                fontSize: 13, color: t.fgMuted, fontWeight: 400,
                letterSpacing: "0.01em",
              }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>
      <Divider />
    </>
  );
}

// ── FEATURES BENTO ────────────────────────────────────────────────────────────
function Features() {
  const features = [
    { icon: Palette, title: "Complete design worlds", body: "Colors, typography, spacing, motion, and 15+ annotated components. The agent understands intent, not just code.", span: "col-span-4 row-span-2" },
    { icon: Code,    title: "Agent-native structure", body: "Philosophy before tokens. Examples as the north star.", span: "col-span-2 row-span-1" },
    { icon: Zap,     title: "One command install", body: "npx getdrip add places the skill exactly where it needs to be.", span: "col-span-2 row-span-1" },
    { icon: Shield,  title: "Persistent context", body: "The skill stays in your project forever.", span: "col-span-2 row-span-1" },
    { icon: BarChart, title: "Growing library", body: "New aesthetics added regularly.", span: "col-span-2 row-span-1" },
    { icon: Globe,   title: "Works everywhere", body: "Cursor, Lovable, Claude Code, Bolt — anywhere.", span: "col-span-2 row-span-1" },
  ];

  return (
    <>
      <section style={{ padding: "96px 24px", maxWidth: 1152, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{
            display: "inline-block", marginBottom: 16,
            fontFamily: "JetBrains Mono, monospace", fontSize: 11,
            fontWeight: 500, color: t.accent, letterSpacing: "0.1em",
          }}>
            // features
          </div>
          <h2 style={{
            fontFamily: "Inter, sans-serif",
            fontSize: "clamp(32px, 4vw, 52px)",
            fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.1,
          }}>
            <span className="text-gradient">Everything your agent needs</span>
          </h2>
        </div>

        {/* Asymmetric bento grid — key visual signature */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gridAutoRows: "180px",
          gap: 12,
        }}>
          {features.map((f, i) => (
            <BentoCard key={i} feature={f} index={i} />
          ))}
        </div>
      </section>
      <Divider />
    </>
  );
}

function BentoCard({ feature, index }) {
  const [hov, setHov] = useState(false);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const ref = useRef(null);

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const spans = [
    { gridColumn: "span 4", gridRow: "span 2" },
    { gridColumn: "span 2", gridRow: "span 1" },
    { gridColumn: "span 2", gridRow: "span 1" },
    { gridColumn: "span 2", gridRow: "span 1" },
    { gridColumn: "span 2", gridRow: "span 1" },
    { gridColumn: "span 2", gridRow: "span 1" },
  ];

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onMouseMove={handleMouseMove}
      style={{
        ...spans[index],
        position: "relative", overflow: "hidden",
        borderRadius: 16, padding: "28px",
        background: "linear-gradient(to bottom, rgba(255,255,255,0.07), rgba(255,255,255,0.02))",
        border: `1px solid ${hov ? t.borderHov : t.border}`,
        boxShadow: hov
          ? "0 0 0 1px rgba(255,255,255,0.10), 0 8px 40px rgba(0,0,0,0.5), 0 0 80px rgba(94,106,210,0.10)"
          : "0 0 0 1px rgba(255,255,255,0.04), 0 2px 20px rgba(0,0,0,0.4)",
        transform: hov ? "translateY(-4px)" : "none",
        transition: `all 300ms ${EXPO}`,
        cursor: "default",
        animation: `scaleIn 0.6s ${EXPO} ${index * 80}ms both`,
      }}
    >
      {/* Mouse spotlight */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: "inherit",
        background: hov
          ? `radial-gradient(300px circle at ${mouse.x}px ${mouse.y}px, rgba(94,106,210,0.12), transparent 70%)`
          : "none",
        opacity: hov ? 1 : 0,
        transition: `opacity 200ms ${EXPO}`,
        pointerEvents: "none",
      }} />

      {/* Gradient border on hover */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: "inherit",
        padding: 1,
        background: "linear-gradient(135deg, rgba(255,255,255,0.15), rgba(94,106,210,0.3), transparent 60%)",
        WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
        WebkitMaskComposite: "xor", maskComposite: "exclude",
        opacity: hov ? 1 : 0,
        transition: `opacity 300ms ${EXPO}`,
        pointerEvents: "none",
      }} />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: "rgba(94,106,210,0.15)",
          border: "1px solid rgba(94,106,210,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 20,
          transition: `background 200ms ${EXPO}`,
        }}>
          <feature.icon size={18} strokeWidth={1.5} color="#818cf8" />
        </div>
        <h3 style={{
          fontSize: index === 0 ? 24 : 16,
          fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.2,
          color: t.fg, marginBottom: 10,
        }}>
          {feature.title}
        </h3>
        <p style={{ fontSize: 13, color: t.fgMuted, lineHeight: 1.6 }}>
          {feature.body}
        </p>
      </div>
    </div>
  );
}

// ── PRICING ───────────────────────────────────────────────────────────────────
function Pricing() {
  const plans = [
    {
      name: "Free", price: "$0", period: "forever",
      desc: "For getting started.",
      features: ["3 free skills", "npx getdrip add", "MIT license", "Community"],
      featured: false,
    },
    {
      name: "Pro", price: "$12", period: "/month",
      desc: "For serious builders.",
      features: ["All 12+ skills", "Priority updates", "New skills first", "Commercial license", "Email support"],
      featured: true,
    },
    {
      name: "Team", price: "$39", period: "/month",
      desc: "For teams that ship.",
      features: ["Everything in Pro", "5 team members", "Shared config", "Slack support", "Custom skills"],
      featured: false,
    },
  ];

  return (
    <>
      <section style={{ padding: "96px 24px", maxWidth: 1152, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{
            fontFamily: "JetBrains Mono, monospace", fontSize: 11,
            fontWeight: 500, color: t.accent, letterSpacing: "0.1em", marginBottom: 16,
          }}>
            // pricing
          </div>
          <h2 style={{
            fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 600,
            letterSpacing: "-0.03em", lineHeight: 1.1,
          }}>
            <span className="text-gradient">Start free. Upgrade when ready.</span>
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, alignItems: "center" }}>
          {plans.map((p, i) => {
            const [hov, setHov] = useState(false);
            return (
              <div key={i}
                onMouseEnter={() => setHov(true)}
                onMouseLeave={() => setHov(false)}
                style={{
                  position: "relative", overflow: "hidden",
                  borderRadius: 20, padding: "36px 32px",
                  background: p.featured
                    ? "linear-gradient(to bottom, rgba(94,106,210,0.15), rgba(94,106,210,0.05))"
                    : "linear-gradient(to bottom, rgba(255,255,255,0.07), rgba(255,255,255,0.02))",
                  border: p.featured
                    ? "1px solid rgba(94,106,210,0.35)"
                    : `1px solid ${hov ? t.borderHov : t.border}`,
                  boxShadow: p.featured
                    ? "0 0 0 1px rgba(94,106,210,0.3), 0 8px 60px rgba(94,106,210,0.15), 0 0 100px rgba(94,106,210,0.05)"
                    : hov
                    ? "0 0 0 1px rgba(255,255,255,0.10), 0 8px 40px rgba(0,0,0,0.5)"
                    : "0 0 0 1px rgba(255,255,255,0.04), 0 4px 20px rgba(0,0,0,0.4)",
                  transform: p.featured
                    ? (hov ? "translateY(-8px) scale(1.02)" : "translateY(-4px) scale(1.02)")
                    : (hov ? "translateY(-4px)" : "none"),
                  transition: `all 300ms ${EXPO}`,
                }}>

                {p.featured && (
                  <div style={{
                    position: "absolute", top: 20, right: 20,
                    padding: "3px 10px", borderRadius: 9999,
                    background: "rgba(94,106,210,0.2)",
                    border: "1px solid rgba(94,106,210,0.4)",
                    fontSize: 11, fontWeight: 500, color: "#818cf8",
                    letterSpacing: "0.02em",
                  }}>
                    Most popular
                  </div>
                )}

                <div style={{ fontSize: 16, fontWeight: 600, color: t.fg, marginBottom: 6 }}>{p.name}</div>
                <div style={{ fontSize: 13, color: t.fgMuted, marginBottom: 28 }}>{p.desc}</div>

                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 32 }}>
                  <span style={{
                    fontSize: 48, fontWeight: 600, letterSpacing: "-0.04em", lineHeight: 1,
                    background: "linear-gradient(to bottom, #fff, rgba(255,255,255,0.75))",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  }}>{p.price}</span>
                  <span style={{ fontSize: 13, color: t.fgMuted }}>{p.period}</span>
                </div>

                <button style={{
                  display: "block", width: "100%",
                  padding: "10px 0", borderRadius: 8, border: "none",
                  background: p.featured ? "#5E6AD2" : "rgba(255,255,255,0.06)",
                  color: p.featured ? "#fff" : t.fg,
                  fontSize: 14, fontWeight: 500, fontFamily: "Inter, sans-serif",
                  letterSpacing: "-0.01em", cursor: "pointer",
                  boxShadow: p.featured
                    ? "0 0 0 1px rgba(94,106,210,0.5), 0 4px 12px rgba(94,106,210,0.3), inset 0 1px 0 rgba(255,255,255,0.2)"
                    : "inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 1px rgba(255,255,255,0.06)",
                  marginBottom: 28,
                  transition: `all 200ms ${EXPO}`,
                }}>
                  {p.name === "Free" ? "Start free" : `Choose ${p.name}`}
                </button>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {p.features.map(f => (
                    <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: "50%",
                        background: "rgba(94,106,210,0.15)",
                        border: "1px solid rgba(94,106,210,0.25)",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        <Check size={10} strokeWidth={2} color="#818cf8" />
                      </div>
                      <span style={{ fontSize: 13, color: t.fgMuted }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <Divider />
    </>
  );
}

// ── CTA ───────────────────────────────────────────────────────────────────────
function CTA() {
  return (
    <section style={{ padding: "120px 24px", textAlign: "center", maxWidth: 900, margin: "0 auto" }}>
      <div style={{
        marginBottom: 16,
        fontFamily: "JetBrains Mono, monospace", fontSize: 11,
        fontWeight: 500, color: t.accent, letterSpacing: "0.1em",
      }}>
        // get started
      </div>
      <h2 style={{
        fontSize: "clamp(36px, 6vw, 72px)", fontWeight: 600,
        letterSpacing: "-0.04em", lineHeight: 1.05, marginBottom: 24,
      }}>
        <span className="text-gradient">Give your app the design</span><br />
        <span className="text-shimmer">it deserves.</span>
      </h2>
      <p style={{
        fontSize: 18, color: t.fgMuted, lineHeight: 1.7,
        marginBottom: 48, maxWidth: 520, margin: "0 auto 48px",
      }}>
        One command. Your entire project gets a real design system.
        Your agent builds everything that follows in the same style.
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <AccentBtn icon={ArrowRight}>Browse skills</AccentBtn>
        <AccentBtn variant="secondary">Read the docs</AccentBtn>
      </div>
    </section>
  );
}

// ── FOOTER ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <>
      <Divider />
      <footer style={{
        padding: "32px 24px", maxWidth: 1152, margin: "0 auto",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 20, height: 20, borderRadius: 5,
            background: "linear-gradient(135deg, #5E6AD2, #6872D9)",
            boxShadow: "0 0 8px rgba(94,106,210,0.4)",
          }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: t.fg, letterSpacing: "-0.02em" }}>Drip</span>
        </div>
        <span style={{ fontSize: 12, color: t.fgMuted }}>
          © 2024 Drip — Give your app the design it deserves
        </span>
        <div style={{ display: "flex", gap: 24 }}>
          {["Skills", "Docs", "GitHub", "npm"].map(l => (
            <a key={l} href="#" style={{
              fontSize: 13, color: t.fgMuted,
              textDecoration: "none", transition: `color 200ms ${EXPO}`,
            }}
              onMouseEnter={e => e.target.style.color = t.fg}
              onMouseLeave={e => e.target.style.color = t.fgMuted}
            >{l}</a>
          ))}
        </div>
      </footer>
    </>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function LinearLandingPage() {
  return (
    <>
      <style>{styles}</style>
      <div style={{ minHeight: "100vh", background: t.bgBase, position: "relative" }}>
        <Background />
        <div style={{ position: "relative", zIndex: 1 }}>
          <Nav />
          <Hero />
          <Stats />
          <Features />
          <Pricing />
          <CTA />
          <Footer />
        </div>
      </div>
    </>
  );
}
