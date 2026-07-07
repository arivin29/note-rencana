// ============================================================
// Schematic Symbol Variants — multiple P&ID glyph styles per node type
// so users can pick the symbol that fits their drawing convention.
// All variants: viewBox 0 0 64 64, stroke="currentColor", connection
// stubs to the edges so pipe handles connect flush.
//
// Add a type here → it automatically gets a "Symbol Style" picker in
// the Appearance tab. Index 0 is the default.
// ============================================================

import React from 'react'

const svgProps = {
  viewBox: '0 0 64 64',
  fill: 'none',
  className: 'w-full h-full',
  stroke: 'currentColor',
  strokeWidth: 2,
} as const

// ── PRESSURE ──────────────────────────────────────────────────
const pressureVariants: React.ReactNode[] = [
  // 0 — Analog dial gauge (pictorial)
  <svg key="p0" {...svgProps}>
    <line x1="32" y1="46" x2="32" y2="64" strokeWidth={3} opacity={0.5} />
    <line x1="0" y1="30" x2="10" y2="30" strokeWidth={3} opacity={0.5} />
    <line x1="54" y1="30" x2="64" y2="30" strokeWidth={3} opacity={0.5} />
    <circle cx="32" cy="28" r="18" strokeWidth={2.5} />
    <path d="M20 30a12 12 0 0 1 24 0" strokeWidth={1.5} opacity={0.55} />
    <line x1="24" y1="24" x2="26" y2="25.5" strokeWidth={1.2} opacity={0.5} />
    <line x1="32" y1="21" x2="32" y2="23" strokeWidth={1.2} opacity={0.5} />
    <line x1="40" y1="24" x2="38" y2="25.5" strokeWidth={1.2} opacity={0.5} />
    <line x1="32" y1="28" x2="41" y2="19" strokeWidth={2.5} strokeLinecap="round" />
    <circle cx="32" cy="28" r="2.5" fill="currentColor" stroke="none" />
    <line x1="32" y1="46" x2="32" y2="50" strokeWidth={3} />
  </svg>,
  // 1 — ISA instrument bubble (field-mounted: circle + center line + tag)
  <svg key="p1" {...svgProps}>
    <line x1="32" y1="52" x2="32" y2="64" strokeWidth={3} opacity={0.5} />
    <line x1="0" y1="32" x2="12" y2="32" strokeWidth={3} opacity={0.5} />
    <line x1="52" y1="32" x2="64" y2="32" strokeWidth={3} opacity={0.5} />
    <circle cx="32" cy="30" r="19" strokeWidth={2.5} />
    <line x1="13" y1="30" x2="51" y2="30" strokeWidth={1.3} opacity={0.4} />
    <text x="32" y="27" textAnchor="middle" fill="currentColor" fontSize="12" fontWeight="bold" stroke="none">PT</text>
  </svg>,
  // 2 — Smart transmitter (rounded body + LCD + process stub)
  <svg key="p2" {...svgProps}>
    <line x1="32" y1="50" x2="32" y2="64" strokeWidth={3} opacity={0.5} />
    <rect x="14" y="8" width="36" height="30" rx="6" strokeWidth={2.5} />
    <rect x="20" y="14" width="24" height="12" rx="2" strokeWidth={1.5} fill="currentColor" fillOpacity={0.12} />
    <text x="32" y="24" textAnchor="middle" fill="currentColor" fontSize="9" fontWeight="bold" stroke="none">P</text>
    <path d="M22 30h20" strokeWidth={1.2} opacity={0.4} />
    {/* flange to process */}
    <rect x="26" y="38" width="12" height="6" rx="1" strokeWidth={2} fill="currentColor" fillOpacity={0.15} />
    <line x1="28" y1="44" x2="28" y2="50" strokeWidth={1.5} />
    <line x1="36" y1="44" x2="36" y2="50" strokeWidth={1.5} />
  </svg>,
]

// ── FLOW (flowmeter) ──────────────────────────────────────────
const flowVariants: React.ReactNode[] = [
  // 0 — ISA instrument bubble "FT"
  <svg key="f0" {...svgProps}>
    <line x1="0" y1="32" x2="12" y2="32" strokeWidth={3} opacity={0.5} />
    <line x1="52" y1="32" x2="64" y2="32" strokeWidth={3} opacity={0.5} />
    <circle cx="32" cy="32" r="20" strokeWidth={2.5} />
    <line x1="12" y1="32" x2="52" y2="32" strokeWidth={1.3} opacity={0.4} />
    <text x="32" y="28" textAnchor="middle" fill="currentColor" fontSize="12" fontWeight="bold" stroke="none">FT</text>
  </svg>,
  // 1 — Electromagnetic flowmeter (inline pipe body + sensor head + flow arrow)
  <svg key="f1" {...svgProps}>
    <line x1="0" y1="38" x2="10" y2="38" strokeWidth={3} opacity={0.5} />
    <line x1="54" y1="38" x2="64" y2="38" strokeWidth={3} opacity={0.5} />
    {/* pipe body */}
    <rect x="10" y="30" width="44" height="16" rx="2" strokeWidth={2.5} />
    {/* flow arrow */}
    <path d="M22 38h18" strokeWidth={2} strokeLinecap="round" />
    <path d="M38 34l6 4-6 4" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    {/* sensor head / converter */}
    <rect x="24" y="8" width="16" height="16" rx="2" strokeWidth={2.5} fill="currentColor" fillOpacity={0.1} />
    <line x1="32" y1="24" x2="32" y2="30" strokeWidth={2} />
    <text x="32" y="20" textAnchor="middle" fill="currentColor" fontSize="9" fontWeight="bold" stroke="none">M</text>
  </svg>,
  // 2 — Variable-area rotameter (tapered tube + float)
  <svg key="f2" {...svgProps}>
    <line x1="32" y1="0" x2="32" y2="8" strokeWidth={3} opacity={0.5} />
    <line x1="32" y1="56" x2="32" y2="64" strokeWidth={3} opacity={0.5} />
    {/* tapered tube (narrow bottom, wide top) */}
    <path d="M25 56 L21 12 L43 12 L39 56 Z" strokeWidth={2.5} strokeLinejoin="round" />
    {/* scale ticks */}
    <line x1="40" y1="20" x2="43" y2="20" strokeWidth={1} opacity={0.4} />
    <line x1="39" y1="32" x2="42" y2="32" strokeWidth={1} opacity={0.4} />
    <line x1="38" y1="44" x2="41" y2="44" strokeWidth={1} opacity={0.4} />
    {/* float */}
    <path d="M26 40 L38 40 L32 32 Z" fill="currentColor" fillOpacity={0.25} strokeWidth={1.5} strokeLinejoin="round" />
  </svg>,
]

// ── RESERVOIR ─────────────────────────────────────────────────
// Keep a roughly rectangular fill zone so the data-driven water overlay
// (TankWaterOverlay) still lines up reasonably across variants.
const reservoirVariants: React.ReactNode[] = [
  // 0 — Rounded rectangular tank + waterline
  <svg key="r0" {...svgProps}>
    <line x1="0" y1="32" x2="6" y2="32" strokeWidth={3} opacity={0.5} />
    <line x1="58" y1="32" x2="64" y2="32" strokeWidth={3} opacity={0.5} />
    <line x1="32" y1="58" x2="32" y2="64" strokeWidth={3} opacity={0.5} />
    <rect x="6" y="6" width="52" height="52" rx="4" strokeWidth={2.5} />
    <path d="M6 30c8-3 14 3 22 0s16 3 24 0" strokeWidth={1.5} opacity={0.45} />
    <line x1="2" y1="18" x2="6" y2="18" strokeWidth={1.5} opacity={0.5} />
    <line x1="2" y1="32" x2="6" y2="32" strokeWidth={1.5} opacity={0.5} />
    <line x1="2" y1="46" x2="6" y2="46" strokeWidth={1.5} opacity={0.5} />
  </svg>,
  // 1 — Vertical cylinder (3D) — elliptical top & bottom
  <svg key="r1" {...svgProps}>
    <line x1="0" y1="34" x2="8" y2="34" strokeWidth={3} opacity={0.5} />
    <line x1="56" y1="34" x2="64" y2="34" strokeWidth={3} opacity={0.5} />
    <line x1="32" y1="58" x2="32" y2="64" strokeWidth={3} opacity={0.5} />
    {/* body */}
    <path d="M12 12 V52" strokeWidth={2.5} />
    <path d="M52 12 V52" strokeWidth={2.5} />
    {/* bottom ellipse */}
    <path d="M12 52a20 6 0 0 0 40 0" strokeWidth={2.5} />
    {/* top ellipse */}
    <ellipse cx="32" cy="12" rx="20" ry="6" strokeWidth={2.5} />
    {/* waterline ellipse */}
    <path d="M12 30a20 6 0 0 0 40 0" strokeWidth={1.3} opacity={0.4} />
  </svg>,
  // 2 — Storage tank with domed roof
  <svg key="r2" {...svgProps}>
    <line x1="0" y1="38" x2="8" y2="38" strokeWidth={3} opacity={0.5} />
    <line x1="56" y1="38" x2="64" y2="38" strokeWidth={3} opacity={0.5} />
    <line x1="32" y1="56" x2="32" y2="64" strokeWidth={3} opacity={0.5} />
    {/* dome roof */}
    <path d="M10 20a22 14 0 0 1 44 0" strokeWidth={2.5} />
    {/* body */}
    <path d="M10 20 V54 h44 V20" strokeWidth={2.5} strokeLinejoin="round" />
    {/* nozzle on dome */}
    <line x1="32" y1="6" x2="32" y2="10" strokeWidth={2} />
    {/* waterline */}
    <path d="M10 34c7-2.5 15 2.5 22 0s15 2.5 22 0" strokeWidth={1.4} opacity={0.45} />
  </svg>,
]

// ── PUMP ──────────────────────────────────────────────────────
const pumpVariants: React.ReactNode[] = [
  // 0 — Centrifugal (circle + impeller + top discharge)
  <svg key="pu0" {...svgProps}>
    <line x1="0" y1="32" x2="14" y2="32" strokeWidth={3} opacity={0.5} />
    <line x1="32" y1="0" x2="32" y2="14" strokeWidth={3} opacity={0.5} />
    <circle cx="32" cy="32" r="18" strokeWidth={2.5} />
    <polygon points="32,20 43,38 21,38" fill="currentColor" fillOpacity={0.18} strokeWidth={2} />
  </svg>,
  // 1 — Inline booster (left+right flow, arrow)
  <svg key="pu1" {...svgProps}>
    <line x1="0" y1="32" x2="14" y2="32" strokeWidth={3} opacity={0.5} />
    <line x1="50" y1="32" x2="64" y2="32" strokeWidth={3} opacity={0.5} />
    <circle cx="32" cy="32" r="18" strokeWidth={2.5} />
    <polygon points="32,20 43,38 21,38" fill="currentColor" fillOpacity={0.18} strokeWidth={2} />
    <path d="M45 29l5 3-5 3" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>,
  // 2 — End-suction on base (feet + top discharge)
  <svg key="pu2" {...svgProps}>
    <line x1="32" y1="0" x2="32" y2="14" strokeWidth={3} opacity={0.5} />
    <line x1="0" y1="30" x2="14" y2="30" strokeWidth={3} opacity={0.5} />
    <circle cx="32" cy="29" r="16" strokeWidth={2.5} />
    <polygon points="32,18 42,34 22,34" fill="currentColor" fillOpacity={0.18} strokeWidth={2} />
    <line x1="18" y1="50" x2="46" y2="50" strokeWidth={2.5} />
    <line x1="24" y1="45" x2="24" y2="50" strokeWidth={2} />
    <line x1="40" y1="45" x2="40" y2="50" strokeWidth={2} />
  </svg>,
]

// ── MOTOR ─────────────────────────────────────────────────────
const motorVariants: React.ReactNode[] = [
  // 0 — ISA "M" circle
  <svg key="mo0" {...svgProps}>
    <line x1="0" y1="32" x2="14" y2="32" strokeWidth={3} opacity={0.5} />
    <line x1="50" y1="32" x2="64" y2="32" strokeWidth={3} opacity={0.5} />
    <circle cx="32" cy="32" r="18" strokeWidth={2.5} />
    <text x="32" y="38" textAnchor="middle" fontSize="16" fontWeight="bold" fill="currentColor" stroke="none">M</text>
  </svg>,
  // 1 — Motor housing (cooling fins + shaft)
  <svg key="mo1" {...svgProps}>
    <line x1="48" y1="32" x2="64" y2="32" strokeWidth={2.5} opacity={0.6} />
    <rect x="10" y="18" width="34" height="28" rx="3" strokeWidth={2.5} />
    <line x1="17" y1="18" x2="17" y2="46" strokeWidth={1.2} opacity={0.4} />
    <line x1="23" y1="18" x2="23" y2="46" strokeWidth={1.2} opacity={0.4} />
    <line x1="29" y1="18" x2="29" y2="46" strokeWidth={1.2} opacity={0.4} />
    <rect x="44" y="28" width="5" height="8" strokeWidth={2} />
  </svg>,
  // 2 — Motor + terminal box
  <svg key="mo2" {...svgProps}>
    <line x1="0" y1="36" x2="12" y2="36" strokeWidth={2.5} opacity={0.6} />
    <rect x="12" y="24" width="36" height="24" rx="3" strokeWidth={2.5} />
    <rect x="24" y="13" width="14" height="11" rx="2" strokeWidth={2} fill="currentColor" fillOpacity={0.1} />
    <text x="30" y="41" textAnchor="middle" fontSize="12" fontWeight="bold" fill="currentColor" stroke="none">M</text>
  </svg>,
]

// ── VALVE ─────────────────────────────────────────────────────
const valveVariants: React.ReactNode[] = [
  // 0 — Gate (bowtie)
  <svg key="v0" {...svgProps}>
    <line x1="0" y1="32" x2="18" y2="32" strokeWidth={3} opacity={0.5} />
    <line x1="46" y1="32" x2="64" y2="32" strokeWidth={3} opacity={0.5} />
    <path d="M18 20 L18 44 L32 32 Z" strokeWidth={2.5} strokeLinejoin="round" />
    <path d="M46 20 L46 44 L32 32 Z" strokeWidth={2.5} strokeLinejoin="round" />
  </svg>,
  // 1 — Globe (bowtie + seat circle)
  <svg key="v1" {...svgProps}>
    <line x1="0" y1="32" x2="18" y2="32" strokeWidth={3} opacity={0.5} />
    <line x1="46" y1="32" x2="64" y2="32" strokeWidth={3} opacity={0.5} />
    <path d="M18 20 L18 44 L32 32 Z" strokeWidth={2.5} strokeLinejoin="round" />
    <path d="M46 20 L46 44 L32 32 Z" strokeWidth={2.5} strokeLinejoin="round" />
    <circle cx="32" cy="32" r="6.5" strokeWidth={2} fill="none" />
  </svg>,
  // 2 — Butterfly (circle + disc)
  <svg key="v2" {...svgProps}>
    <line x1="0" y1="32" x2="18" y2="32" strokeWidth={3} opacity={0.5} />
    <line x1="46" y1="32" x2="64" y2="32" strokeWidth={3} opacity={0.5} />
    <circle cx="32" cy="32" r="14" strokeWidth={2.5} />
    <line x1="24" y1="24" x2="40" y2="40" strokeWidth={2.5} strokeLinecap="round" />
    <circle cx="32" cy="32" r="2.5" fill="currentColor" stroke="none" />
  </svg>,
]

// ── CHECK VALVE ───────────────────────────────────────────────
const checkValveVariants: React.ReactNode[] = [
  // 0 — Swing check (flow triangle + seat)
  <svg key="c0" {...svgProps}>
    <line x1="0" y1="32" x2="20" y2="32" strokeWidth={3} opacity={0.5} />
    <line x1="42" y1="32" x2="64" y2="32" strokeWidth={3} opacity={0.5} />
    <path d="M20 20 L20 44 L42 32 Z" strokeWidth={2.5} strokeLinejoin="round" fill="currentColor" fillOpacity={0.1} />
    <line x1="42" y1="18" x2="42" y2="46" strokeWidth={2.5} />
  </svg>,
  // 1 — Ball check (ball + seat)
  <svg key="c1" {...svgProps}>
    <line x1="0" y1="32" x2="16" y2="32" strokeWidth={3} opacity={0.5} />
    <line x1="48" y1="32" x2="64" y2="32" strokeWidth={3} opacity={0.5} />
    <path d="M16 20 L16 44 M48 20 L48 44" strokeWidth={2} opacity={0.5} />
    <circle cx="30" cy="32" r="7" strokeWidth={2.5} fill="currentColor" fillOpacity={0.12} />
    <line x1="41" y1="22" x2="41" y2="42" strokeWidth={2.5} />
  </svg>,
]

// ── FILTER ────────────────────────────────────────────────────
const filterVariants: React.ReactNode[] = [
  // 0 — Rectangular media bed
  <svg key="fi0" {...svgProps}>
    <line x1="0" y1="32" x2="14" y2="32" strokeWidth={3} opacity={0.5} />
    <line x1="50" y1="32" x2="64" y2="32" strokeWidth={3} opacity={0.5} />
    <rect x="14" y="16" width="36" height="32" rx="2" strokeWidth={2.5} />
    <path d="M14 26h36M14 34h36" strokeWidth={1} opacity={0.35} />
    <g fill="currentColor" fillOpacity={0.4} stroke="none">
      <circle cx="22" cy="41" r="1.3" /><circle cx="30" cy="41" r="1.3" /><circle cx="38" cy="41" r="1.3" /><circle cx="46" cy="41" r="1.3" />
    </g>
  </svg>,
  // 1 — Vertical cylinder (pressure filter)
  <svg key="fi1" {...svgProps}>
    <line x1="32" y1="0" x2="32" y2="8" strokeWidth={3} opacity={0.5} />
    <line x1="32" y1="56" x2="32" y2="64" strokeWidth={3} opacity={0.5} />
    <rect x="20" y="10" width="24" height="44" rx="12" strokeWidth={2.5} />
    <path d="M22 24h20M22 32h20M22 40h20" strokeWidth={1.2} opacity={0.35} />
  </svg>,
  // 2 — Cartridge (pleated media)
  <svg key="fi2" {...svgProps}>
    <line x1="0" y1="32" x2="14" y2="32" strokeWidth={3} opacity={0.5} />
    <line x1="50" y1="32" x2="64" y2="32" strokeWidth={3} opacity={0.5} />
    <rect x="16" y="16" width="32" height="32" rx="2" strokeWidth={2.5} />
    <path d="M22 19 L40 24 L22 29 L40 34 L22 39 L40 44" strokeWidth={1.6} opacity={0.55} fill="none" strokeLinejoin="round" />
  </svg>,
]

// ── Shared connection stubs ───────────────────────────────────
const stubH = (
  <>
    <line x1="0" y1="32" x2="14" y2="32" strokeWidth={3} opacity={0.5} />
    <line x1="50" y1="32" x2="64" y2="32" strokeWidth={3} opacity={0.5} />
  </>
)
const stubV = (
  <>
    <line x1="32" y1="0" x2="32" y2="12" strokeWidth={3} opacity={0.5} />
    <line x1="32" y1="52" x2="32" y2="64" strokeWidth={3} opacity={0.5} />
  </>
)

// ── INSTRUMENT SENSORS (factory: ISA tag) ─────────────────────
function makeInstrumentVariants(tag: string): React.ReactNode[] {
  const fs = tag.length > 2 ? 9 : 12
  return [
    // 0 — Field instrument bubble
    <svg key={`${tag}0`} {...svgProps}>
      {stubV}
      <circle cx="32" cy="26" r="18" strokeWidth={2.5} />
      <line x1="14" y1="26" x2="50" y2="26" strokeWidth={1.2} opacity={0.4} />
      <text x="32" y="23" textAnchor="middle" fontSize={fs} fontWeight="bold" fill="currentColor" stroke="none">{tag}</text>
    </svg>,
    // 1 — Inline probe (pipe body + insertion probe)
    <svg key={`${tag}1`} {...svgProps}>
      {stubH}
      <rect x="14" y="26" width="36" height="12" rx="2" strokeWidth={2.5} />
      <line x1="32" y1="6" x2="32" y2="26" strokeWidth={2.5} />
      <rect x="27" y="3" width="10" height="7" rx="1" strokeWidth={2} />
      <text x="43" y="34.5" textAnchor="middle" fontSize="7" fontWeight="bold" fill="currentColor" stroke="none">{tag}</text>
    </svg>,
    // 2 — Smart transmitter (body + LCD)
    <svg key={`${tag}2`} {...svgProps}>
      <line x1="32" y1="46" x2="32" y2="64" strokeWidth={3} opacity={0.5} />
      <rect x="14" y="10" width="36" height="30" rx="5" strokeWidth={2.5} />
      <rect x="20" y="15" width="24" height="11" rx="2" strokeWidth={1.5} fill="currentColor" fillOpacity={0.12} />
      <text x="32" y="24" textAnchor="middle" fontSize="9" fontWeight="bold" fill="currentColor" stroke="none">{tag}</text>
      <path d="M22 32h20" strokeWidth={1.2} opacity={0.4} />
    </svg>,
  ]
}
const instrumentLabels = ['Bubble', 'Probe Inline', 'Transmitter']

// ── VALVE FAMILY ──────────────────────────────────────────────
const butterflyValveVariants: React.ReactNode[] = [
  <svg key="bv0" {...svgProps}>{stubH}<circle cx="32" cy="32" r="14" strokeWidth={2.5} /><line x1="24" y1="24" x2="40" y2="40" strokeWidth={2.5} strokeLinecap="round" /><circle cx="32" cy="32" r="2.5" fill="currentColor" stroke="none" /></svg>,
  <svg key="bv1" {...svgProps}>{stubH}<circle cx="32" cy="34" r="13" strokeWidth={2.5} /><line x1="24" y1="27" x2="40" y2="41" strokeWidth={2.5} strokeLinecap="round" /><line x1="32" y1="21" x2="32" y2="10" strokeWidth={2} /><rect x="26" y="4" width="12" height="8" rx="1" strokeWidth={2} /></svg>,
]
const solenoidValveVariants: React.ReactNode[] = [
  <svg key="sv0" {...svgProps}>{stubH}
    <path d="M18 22 L18 42 L32 32 Z" strokeWidth={2.5} strokeLinejoin="round" />
    <path d="M46 22 L46 42 L32 32 Z" strokeWidth={2.5} strokeLinejoin="round" />
    <rect x="26" y="8" width="12" height="10" rx="1" strokeWidth={2} />
    <text x="32" y="16.5" textAnchor="middle" fontSize="7" fontWeight="bold" fill="currentColor" stroke="none">S</text>
    <line x1="32" y1="18" x2="32" y2="26" strokeWidth={1.5} />
  </svg>,
  <svg key="sv1" {...svgProps}>{stubH}
    <path d="M18 22 L18 42 L32 32 Z" strokeWidth={2.5} strokeLinejoin="round" />
    <path d="M46 22 L46 42 L32 32 Z" strokeWidth={2.5} strokeLinejoin="round" />
    <path d="M25 14 q3 -5 7 0 t7 0" strokeWidth={1.8} fill="none" strokeLinecap="round" />
    <line x1="32" y1="18" x2="32" y2="26" strokeWidth={1.5} />
  </svg>,
]
const prvVariants: React.ReactNode[] = [
  <svg key="pr0" {...svgProps}>{stubH}
    <path d="M18 26 L18 44 L32 35 Z" strokeWidth={2.5} strokeLinejoin="round" />
    <path d="M46 26 L46 44 L32 35 Z" strokeWidth={2.5} strokeLinejoin="round" />
    <path d="M24 22 h16" strokeWidth={2} />
    <path d="M28 22 l4 -8 l4 8" strokeWidth={2} fill="none" strokeLinejoin="round" />
    <line x1="32" y1="14" x2="32" y2="9" strokeWidth={2} />
  </svg>,
  <svg key="pr1" {...svgProps}>{stubH}
    <path d="M18 30 L18 46 L32 38 Z" strokeWidth={2.5} strokeLinejoin="round" />
    <path d="M46 30 L46 46 L32 38 Z" strokeWidth={2.5} strokeLinejoin="round" />
    <path d="M22 22 a10 8 0 0 1 20 0 Z" strokeWidth={2.5} fill="currentColor" fillOpacity={0.08} />
    <line x1="32" y1="22" x2="32" y2="30" strokeWidth={1.5} />
  </svg>,
]
const strainerVariants: React.ReactNode[] = [
  <svg key="st0" {...svgProps}>{stubH}
    <path d="M14 28 h36 v8 h-36 z" strokeWidth={2.5} strokeLinejoin="round" />
    <path d="M34 36 l10 14" strokeWidth={2.5} />
    <path d="M40 44 l8 -3" strokeWidth={2.5} />
    <line x1="36" y1="40" x2="42" y2="46" strokeWidth={1.2} opacity={0.5} />
  </svg>,
  <svg key="st1" {...svgProps}>{stubH}
    <rect x="18" y="18" width="28" height="28" rx="2" strokeWidth={2.5} />
    <path d="M24 24 v16 M32 24 v16 M40 24 v16" strokeWidth={1.2} opacity={0.5} />
  </svg>,
]
const airReleaseVariants: React.ReactNode[] = [
  <svg key="ar0" {...svgProps}>
    <line x1="32" y1="48" x2="32" y2="64" strokeWidth={3} opacity={0.5} />
    <circle cx="32" cy="34" r="12" strokeWidth={2.5} />
    <path d="M32 30 v-8 M29 25 l3 -3 l3 3" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="32" cy="36" r="3" strokeWidth={1.5} />
  </svg>,
  <svg key="ar1" {...svgProps}>
    <line x1="32" y1="50" x2="32" y2="64" strokeWidth={3} opacity={0.5} />
    <rect x="20" y="22" width="24" height="24" rx="3" strokeWidth={2.5} />
    <path d="M27 20 v-6 M24 17 l3 -3 l3 3" strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M39 20 v-6 M36 17 l3 -3 l3 3" strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>,
]

// ── TREATMENT (IPA) ───────────────────────────────────────────
const intakeVariants: React.ReactNode[] = [
  <svg key="in0" {...svgProps}>
    <line x1="50" y1="32" x2="64" y2="32" strokeWidth={3} opacity={0.5} />
    <rect x="12" y="16" width="26" height="34" rx="2" strokeWidth={2.5} />
    <path d="M18 16v34M24 16v34M30 16v34" strokeWidth={1} opacity={0.4} />
    <path d="M40 32h8" strokeWidth={2} strokeLinecap="round" />
    <path d="M44 29l4 3-4 3" strokeWidth={2} fill="none" strokeLinejoin="round" />
  </svg>,
  <svg key="in1" {...svgProps}>
    <line x1="32" y1="56" x2="32" y2="64" strokeWidth={3} opacity={0.5} />
    <rect x="22" y="10" width="20" height="44" rx="2" strokeWidth={2.5} />
    <path d="M24 22h16M24 32h16M24 42h16" strokeWidth={1.2} opacity={0.4} />
    <path d="M22 10l10-6 10 6" strokeWidth={2.5} fill="none" strokeLinejoin="round" />
  </svg>,
]
const wtpVariants: React.ReactNode[] = [
  <svg key="wt0" {...svgProps}>{stubH}<rect x="10" y="16" width="44" height="32" rx="3" strokeWidth={2.5} /><text x="32" y="36" textAnchor="middle" fontSize="11" fontWeight="bold" fill="currentColor" stroke="none">WTP</text></svg>,
  <svg key="wt1" {...svgProps}>{stubH}
    <rect x="10" y="22" width="13" height="20" rx="2" strokeWidth={2} />
    <rect x="25" y="22" width="14" height="20" rx="2" strokeWidth={2} />
    <rect x="41" y="22" width="13" height="20" rx="2" strokeWidth={2} />
    <path d="M23 32h2M39 32h2" strokeWidth={1.5} opacity={0.5} />
  </svg>,
]
const aeratorVariants: React.ReactNode[] = [
  <svg key="ae0" {...svgProps}>{stubH}
    <rect x="12" y="20" width="40" height="28" rx="2" strokeWidth={2.5} />
    <path d="M14 30h36" strokeWidth={1} opacity={0.3} />
    <g fill="currentColor" fillOpacity={0.4} stroke="none"><circle cx="20" cy="42" r="1.5" /><circle cx="26" cy="38" r="1.5" /><circle cx="24" cy="44" r="1.2" /><circle cx="34" cy="40" r="1.5" /><circle cx="40" cy="43" r="1.5" /><circle cx="44" cy="38" r="1.2" /></g>
  </svg>,
  <svg key="ae1" {...svgProps}>{stubV}
    <circle cx="32" cy="30" r="14" strokeWidth={2.5} />
    <path d="M32 30l8-6M32 30l-9 3M32 30l4 9" strokeWidth={2} strokeLinecap="round" />
    <circle cx="32" cy="30" r="2.5" fill="currentColor" stroke="none" />
  </svg>,
]
const clarifierVariants: React.ReactNode[] = [
  <svg key="cl0" {...svgProps}>{stubH}<circle cx="32" cy="32" r="20" strokeWidth={2.5} /><circle cx="32" cy="32" r="4" strokeWidth={2} /><line x1="32" y1="12" x2="32" y2="52" strokeWidth={1.5} opacity={0.5} /></svg>,
  <svg key="cl1" {...svgProps}>{stubH}<rect x="10" y="20" width="44" height="24" rx="2" strokeWidth={2.5} /><path d="M10 26h44" strokeWidth={1} opacity={0.35} /><path d="M40 44l6-8h-6z" fill="currentColor" fillOpacity={0.15} strokeWidth={1.5} /></svg>,
]
const sedimentationVariants: React.ReactNode[] = [
  <svg key="se0" {...svgProps}>{stubH}
    <path d="M10 20 H54 V36 L38 48 H26 L10 36 Z" strokeWidth={2.5} strokeLinejoin="round" />
    <path d="M10 26h44" strokeWidth={1} opacity={0.35} />
    <g fill="currentColor" fillOpacity={0.3} stroke="none"><circle cx="30" cy="42" r="1.3" /><circle cx="34" cy="43" r="1.3" /></g>
  </svg>,
  <svg key="se1" {...svgProps}>{stubH}
    <rect x="12" y="18" width="40" height="30" rx="2" strokeWidth={2.5} />
    <path d="M18 44 L26 22M26 44 L34 22M34 44 L42 22M42 44 L50 22" strokeWidth={1.3} opacity={0.5} />
  </svg>,
]
const chemicalDosingVariants: React.ReactNode[] = [
  <svg key="cd0" {...svgProps}>
    <line x1="32" y1="56" x2="32" y2="64" strokeWidth={3} opacity={0.5} />
    <path d="M20 16 H44 V48 H20 Z" strokeWidth={2.5} strokeLinejoin="round" />
    <path d="M22 34h20" strokeWidth={1.2} opacity={0.4} />
    <path d="M32 20c-2 3-3 4-3 6a3 3 0 006 0c0-2-1-3-3-6z" fill="currentColor" fillOpacity={0.3} strokeWidth={1.5} />
  </svg>,
  <svg key="cd1" {...svgProps}>{stubH}
    <rect x="14" y="26" width="22" height="14" rx="2" strokeWidth={2.5} />
    <circle cx="44" cy="20" r="7" strokeWidth={2} />
    <line x1="44" y1="27" x2="44" y2="26" strokeWidth={2} />
    <path d="M36 33h-4" strokeWidth={1.5} opacity={0.5} />
  </svg>,
]
const blowerVariants: React.ReactNode[] = [
  <svg key="bl0" {...svgProps}>{stubH}
    <circle cx="30" cy="34" r="15" strokeWidth={2.5} />
    <path d="M30 34 a10 10 0 0 1 10 -10" strokeWidth={1.5} opacity={0.5} fill="none" />
    <path d="M40 24 h8" strokeWidth={2.5} />
  </svg>,
  <svg key="bl1" {...svgProps}>{stubH}
    <rect x="16" y="20" width="32" height="24" rx="3" strokeWidth={2.5} />
    <circle cx="27" cy="32" r="6" strokeWidth={1.8} />
    <circle cx="39" cy="32" r="6" strokeWidth={1.8} />
  </svg>,
]
const uvVariants: React.ReactNode[] = [
  <svg key="uv0" {...svgProps}>{stubH}
    <rect x="12" y="24" width="40" height="16" rx="8" strokeWidth={2.5} />
    <path d="M20 32q3-5 6 0t6 0t6 0" strokeWidth={1.6} opacity={0.6} fill="none" strokeLinecap="round" />
    <text x="45" y="35" textAnchor="middle" fontSize="8" fontWeight="bold" fill="currentColor" stroke="none">UV</text>
  </svg>,
  <svg key="uv1" {...svgProps}>{stubH}
    <rect x="14" y="18" width="36" height="28" rx="3" strokeWidth={2.5} />
    <line x1="26" y1="22" x2="26" y2="42" strokeWidth={2.5} />
    <line x1="38" y1="22" x2="38" y2="42" strokeWidth={2.5} />
    <path d="M31 26q3 4 0 8t0 8" strokeWidth={1.3} opacity={0.5} fill="none" />
  </svg>,
]
const ozoneVariants: React.ReactNode[] = [
  <svg key="oz0" {...svgProps}>{stubH}<rect x="12" y="18" width="40" height="28" rx="3" strokeWidth={2.5} /><text x="32" y="37" textAnchor="middle" fontSize="13" fontWeight="bold" fill="currentColor" stroke="none">O₃</text></svg>,
  <svg key="oz1" {...svgProps}>{stubV}
    <rect x="22" y="10" width="20" height="44" rx="4" strokeWidth={2.5} />
    <g fill="currentColor" fillOpacity={0.35} stroke="none"><circle cx="30" cy="44" r="1.3" /><circle cx="34" cy="40" r="1.3" /><circle cx="31" cy="36" r="1.1" /></g>
    <text x="32" y="24" textAnchor="middle" fontSize="9" fontWeight="bold" fill="currentColor" stroke="none">O₃</text>
  </svg>,
]
const softenerVariants: React.ReactNode[] = [
  <svg key="so0" {...svgProps}>{stubV}
    <rect x="20" y="10" width="24" height="44" rx="12" strokeWidth={2.5} />
    <path d="M22 40h20" strokeWidth={1.3} opacity={0.4} />
    <g fill="currentColor" fillOpacity={0.25} stroke="none"><circle cx="27" cy="46" r="1.5" /><circle cx="32" cy="48" r="1.5" /><circle cx="37" cy="46" r="1.5" /></g>
  </svg>,
  <svg key="so1" {...svgProps}>
    <line x1="32" y1="56" x2="32" y2="64" strokeWidth={3} opacity={0.5} />
    <rect x="12" y="14" width="18" height="40" rx="9" strokeWidth={2.5} />
    <rect x="34" y="14" width="18" height="40" rx="9" strokeWidth={2.5} />
  </svg>,
]

// ── Registry ──────────────────────────────────────────────────
export const SCHEMATIC_VARIANTS: Record<string, React.ReactNode[]> = {
  pressure:    pressureVariants,
  flowmeter:   flowVariants,
  reservoir:   reservoirVariants,
  pump:        pumpVariants,
  motor:       motorVariants,
  valve:       valveVariants,
  check_valve: checkValveVariants,
  filter:      filterVariants,
  // Tanks share the reservoir styles
  tank:          reservoirVariants,
  water_tower:   reservoirVariants,
  break_tank:    reservoirVariants,
  ground_tank:   reservoirVariants,
  elevated_tank: reservoirVariants,
  // Valve family
  gate_valve:      valveVariants,
  butterfly_valve: butterflyValveVariants,
  solenoid_valve:  solenoidValveVariants,
  prv:             prvVariants,
  strainer:        strainerVariants,
  air_release:     airReleaseVariants,
  // Treatment (IPA)
  intake:          intakeVariants,
  wtp:             wtpVariants,
  aerator:         aeratorVariants,
  clarifier:       clarifierVariants,
  sedimentation:   sedimentationVariants,
  chemical_dosing: chemicalDosingVariants,
  blower:          blowerVariants,
  uv_disinfection: uvVariants,
  ozone:           ozoneVariants,
  softener:        softenerVariants,
  // Instrument sensors (dial-hidup capable)
  level_sensor:        makeInstrumentVariants('LT'),
  ph_sensor:           makeInstrumentVariants('pH'),
  turbidity_sensor:    makeInstrumentVariants('TU'),
  chlorine_sensor:     makeInstrumentVariants('Cl'),
  temperature_sensor:  makeInstrumentVariants('TT'),
  conductivity_sensor: makeInstrumentVariants('CT'),
  do_sensor:           makeInstrumentVariants('DO'),
}

// Human-readable variant labels (for the picker tooltips)
export const SCHEMATIC_VARIANT_LABELS: Record<string, string[]> = {
  pressure:    ['Dial Gauge', 'Instrument Bubble', 'Transmitter'],
  flowmeter:   ['Instrument Bubble', 'Magmeter', 'Rotameter'],
  reservoir:   ['Tank', 'Cylinder', 'Domed Tank'],
  pump:        ['Centrifugal', 'Booster Inline', 'End-Suction'],
  motor:       ['M-Circle', 'Housing + Sirip', 'Terminal Box'],
  valve:       ['Gate', 'Globe', 'Butterfly'],
  check_valve: ['Swing Check', 'Ball Check'],
  filter:      ['Media Kotak', 'Silinder', 'Cartridge'],
  // Tanks (reuse reservoir labels)
  tank:          ['Tank', 'Cylinder', 'Domed Tank'],
  water_tower:   ['Tank', 'Cylinder', 'Domed Tank'],
  break_tank:    ['Tank', 'Cylinder', 'Domed Tank'],
  ground_tank:   ['Tank', 'Cylinder', 'Domed Tank'],
  elevated_tank: ['Tank', 'Cylinder', 'Domed Tank'],
  // Valve family
  gate_valve:      ['Gate', 'Globe', 'Butterfly'],
  butterfly_valve: ['Wafer', 'Aktuator'],
  solenoid_valve:  ['Solenoid Box', 'Coil'],
  prv:             ['Spring', 'Diaphragm'],
  strainer:        ['Y-Strainer', 'Basket'],
  air_release:     ['Air Valve', 'Combination'],
  // Treatment (IPA)
  intake:          ['Screened', 'Tower'],
  wtp:             ['Plant Block', 'Multi-Stage'],
  aerator:         ['Diffused', 'Surface'],
  clarifier:       ['Circular', 'Rectangular'],
  sedimentation:   ['Basin', 'Lamella'],
  chemical_dosing: ['Dosing Tank', 'Metering Pump'],
  blower:          ['Centrifugal', 'Roots'],
  uv_disinfection: ['Chamber', 'Vertical Lamp'],
  ozone:           ['Generator', 'Contact Column'],
  softener:        ['Vessel', 'Twin'],
  // Instrument sensors
  level_sensor:        instrumentLabels,
  ph_sensor:           instrumentLabels,
  turbidity_sensor:    instrumentLabels,
  chlorine_sensor:     instrumentLabels,
  temperature_sensor:  instrumentLabels,
  conductivity_sensor: instrumentLabels,
  do_sensor:           instrumentLabels,
}

export function getVariants(nodeType: string): React.ReactNode[] | undefined {
  return SCHEMATIC_VARIANTS[nodeType]
}
