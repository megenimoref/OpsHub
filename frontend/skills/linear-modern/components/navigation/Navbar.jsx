// LINEAR MODERN SKILL — Navbar.jsx
//
// WHY THIS LOOKS THE WAY IT DOES:
// The navbar uses backdrop-blur with a semi-transparent background —
// the classic "frosted glass nav" that defines premium web products.
// As the user scrolls, the content beneath bleeds through, creating
// the sensation that the nav is floating above a live canvas.
//
// The bottom border is a gradient — transparent at edges, visible in center.
// This prevents the harsh horizontal line that breaks the depth illusion.
//
// Nav links: 14px, weight 400 at rest / 500 on hover. The subtlety of
// this change (just font-weight, no background, no border) communicates
// restraint and precision — the hallmarks of this aesthetic.
//
// Logo: "Inter tight" — tight tracking, semibold. The logo mark is a
// small accent-colored square with slight glow, acting as a light source.
//
// Mobile: Hamburger menu with animated open/close. The menu panel
// uses the same backdrop-blur + semi-transparent background system.

import { useState } from "react";
import { Menu, X } from "lucide-react";

const EXPO_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";

export function Navbar({
  brand = "Brand",
  links = [],
  ctaLabel = "Get started",
  onCtaClick,
}) {
  const [hoveredLink, setHoveredLink] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [ctaHovered, setCtaHovered] = useState(false);

  return (
    <>
      <nav style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        // WHY: backdrop-blur creates the "frosted glass" effect
        // The bar appears to float above the animated background
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        background: "rgba(5,5,6,0.8)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        fontFamily: "Inter, system-ui, sans-serif",
      }}>
        <div style={{
          maxWidth: 1152,
          margin: "0 auto",
          padding: "0 24px",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>

          {/* LOGO */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Accent square mark — a small ambient light source */}
            <div style={{
              width: 24, height: 24, borderRadius: 6,
              background: "linear-gradient(135deg, #5E6AD2, #6872D9)",
              boxShadow: "0 0 12px rgba(94,106,210,0.4)",
              flexShrink: 0,
            }} />
            <span style={{
              fontSize: 15, fontWeight: 600, color: "#EDEDEF",
              letterSpacing: "-0.02em",
            }}>
              {brand}
            </span>
          </div>

          {/* DESKTOP NAV LINKS */}
          <div style={{
            display: "flex", gap: 4, alignItems: "center",
          }}>
            {links.map((link, i) => (
              <a
                key={i}
                href={link.href}
                onMouseEnter={() => setHoveredLink(i)}
                onMouseLeave={() => setHoveredLink(null)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: hoveredLink === i ? 500 : 400,
                  color: hoveredLink === i ? "#EDEDEF" : "#8A8F98",
                  textDecoration: "none",
                  background: hoveredLink === i ? "rgba(255,255,255,0.06)" : "transparent",
                  transition: `all 200ms ${EXPO_OUT}`,
                }}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* CTA BUTTON */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onMouseEnter={() => setCtaHovered(true)}
              onMouseLeave={() => setCtaHovered(false)}
              onClick={onCtaClick}
              style={{
                background: ctaHovered ? "#6872D9" : "#5E6AD2",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 8,
                padding: "8px 18px",
                fontSize: 14,
                fontWeight: 500,
                letterSpacing: "-0.01em",
                cursor: "pointer",
                boxShadow: ctaHovered
                  ? "0 0 0 1px rgba(94,106,210,0.7), 0 8px 24px rgba(94,106,210,0.4), inset 0 1px 0 rgba(255,255,255,0.2)"
                  : "0 0 0 1px rgba(94,106,210,0.5), 0 4px 12px rgba(94,106,210,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
                transform: ctaHovered ? "translateY(-1px)" : "none",
                transition: `all 200ms ${EXPO_OUT}`,
                outline: "none",
                fontFamily: "inherit",
              }}
            >
              {ctaLabel}
            </button>

            {/* MOBILE MENU TOGGLE */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{
                display: "none", // show via media query in real impl
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 6,
                padding: "6px",
                color: "#EDEDEF",
                cursor: "pointer",
                outline: "none",
                transition: `all 200ms ${EXPO_OUT}`,
              }}
            >
              {mobileOpen ? <X size={18} strokeWidth={1.5} /> : <Menu size={18} strokeWidth={1.5} />}
            </button>
          </div>
        </div>

        {/* MOBILE MENU PANEL */}
        {mobileOpen && (
          <div style={{
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            background: "rgba(5,5,6,0.95)",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            padding: "16px 24px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            animation: `fadeUp 200ms ${EXPO_OUT} both`,
          }}>
            {links.map((link, i) => (
              <a key={i} href={link.href} style={{
                padding: "10px 12px", borderRadius: 8,
                fontSize: 15, fontWeight: 400, color: "#8A8F98",
                textDecoration: "none",
              }}>
                {link.label}
              </a>
            ))}
            <div style={{ marginTop: 12 }}>
              <button onClick={onCtaClick} style={{
                width: "100%", padding: "12px",
                background: "#5E6AD2", color: "#fff",
                border: "none", borderRadius: 8,
                fontSize: 15, fontWeight: 500,
                cursor: "pointer", fontFamily: "inherit",
                boxShadow: "0 0 0 1px rgba(94,106,210,0.5), 0 4px 12px rgba(94,106,210,0.3)",
              }}>
                {ctaLabel}
              </button>
            </div>
          </div>
        )}
      </nav>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 768px) {
          nav button:last-child { display: flex !important; }
        }
      `}</style>
    </>
  );
}

// ── USAGE EXAMPLES ────────────────────────────────────────────────────────────
// <Navbar
//   brand="Drip"
//   links={[
//     { label: "Skills", href: "/skills" },
//     { label: "Docs", href: "/docs" },
//     { label: "Pricing", href: "/pricing" },
//   ]}
//   ctaLabel="Start building"
//   onCtaClick={() => router.push("/signup")}
// />
