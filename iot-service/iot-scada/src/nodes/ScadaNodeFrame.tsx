// ============================================================
// SCADA Node Frame — Shared wrapper untuk semua node types
// Menampilkan: glyph, label, runtime badge, value, status
// Supports: dynamic size, inline label edit, view-mode tooltip,
//           contextual handle visibility
// ============================================================

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Handle, Position } from '@xyflow/react'
import { useDiagramStore } from '@/stores/useDiagramStore'
import { useUiStore } from '@/stores/useUiStore'
import { useTrendStore } from '@/stores/useTrendStore'
import { TrendCard } from '@/components/TrendCard'
import { Gauge } from '@/components/Gauge'
import type { NodeRuntimeState, RuntimeStatus, NodeStyleConfig, NodeRenderMode, ScadaNodeBinding, ScadaRuntimeBindingDto } from '@/types/scada'
import { getSensorCategory } from './sensorCategories'
import { SCHEMATIC_VARIANTS } from './schematicVariants'

// ── Status helpers ────────────────────────────────────────────

const STATUS_RING: Record<RuntimeStatus, string> = {
  ok:      'ring-status-ok shadow-status-ok',
  warn:    'ring-status-warn shadow-status-warn',
  alert:   'ring-status-alert shadow-status-alert',
  off:     'ring-gray-600',
  offline: 'ring-gray-700',
  stale:   'ring-yellow-600',
  unknown: 'ring-gray-700',
}

const STATUS_DOT: Record<RuntimeStatus, string> = {
  ok:      'bg-status-ok',
  warn:    'bg-status-warn',
  alert:   'bg-status-alert status-dot-pulse',
  off:     'bg-gray-500',
  offline: 'bg-gray-700',
  stale:   'bg-yellow-600 status-dot-pulse',
  unknown: 'bg-gray-600',
}

const STATUS_LABEL: Record<RuntimeStatus, string> = {
  ok:      'OK',
  warn:    'WARN',
  alert:   'ALERT',
  off:     'OFF',
  offline: 'OFFLINE',
  stale:   'STALE',
  unknown: '—',
}

const STATUS_COLOR_TEXT: Record<RuntimeStatus, string> = {
  ok:      'text-status-ok',
  warn:    'text-status-warn',
  alert:   'text-status-alert',
  off:     'text-gray-500',
  offline: 'text-gray-600',
  stale:   'text-yellow-500',
  unknown: 'text-gray-500',
}

// ── P&ID / Schematic SVG Glyphs ───────────────────────────────
// Larger, more detailed engineering-style symbols

// All schematic SVGs use viewBox 0 0 64 64.
// Connection stubs extend from the main body to the viewBox edges (0 and 64)
// so that edge handles connect flush to the symbol — NO gap.

const SchematicGlyph: Record<string, React.ReactNode> = {
  pump: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={2}>
      {/* Connection stubs to edges */}
      <line x1="0" y1="32" x2="12" y2="32" strokeWidth={3} opacity={0.5} />
      <line x1="52" y1="32" x2="64" y2="32" strokeWidth={3} opacity={0.5} />
      <line x1="32" y1="0" x2="32" y2="12" strokeWidth={3} opacity={0.5} />
      <line x1="32" y1="52" x2="32" y2="64" strokeWidth={3} opacity={0.5} />
      {/* Main body */}
      <circle cx="32" cy="32" r="20" strokeWidth={2.5} />
      <polygon points="32,16 46,38 18,38" fill="currentColor" opacity={0.15} stroke="currentColor" strokeWidth={2} />
    </svg>
  ),
  valve: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={2}>
      {/* Connection stubs */}
      <line x1="0" y1="32" x2="12" y2="32" strokeWidth={3} opacity={0.5} />
      <line x1="52" y1="32" x2="64" y2="32" strokeWidth={3} opacity={0.5} />
      <line x1="32" y1="0" x2="32" y2="10" strokeWidth={3} opacity={0.5} />
      {/* Bowtie body */}
      <polygon points="12,18 32,32 12,46" fill="currentColor" opacity={0.12} stroke="currentColor" strokeWidth={2} />
      <polygon points="52,18 32,32 52,46" fill="currentColor" opacity={0.12} stroke="currentColor" strokeWidth={2} />
      {/* Stem + handwheel */}
      <line x1="32" y1="32" x2="32" y2="10" strokeWidth={2.5} strokeLinecap="round" />
      <rect x="24" y="4" width="16" height="6" rx="2" fill="currentColor" opacity={0.2} stroke="currentColor" strokeWidth={1.5} />
    </svg>
  ),
  flowmeter: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={2}>
      {/* Connection stubs */}
      <line x1="0" y1="32" x2="12" y2="32" strokeWidth={3} opacity={0.5} />
      <line x1="52" y1="32" x2="64" y2="32" strokeWidth={3} opacity={0.5} />
      {/* Body */}
      <circle cx="32" cy="32" r="20" strokeWidth={2.5} />
      <text x="32" y="39" textAnchor="middle" fill="currentColor" fontSize="22" fontWeight="bold" stroke="none">F</text>
    </svg>
  ),
  pressure: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={2}>
      {/* Connection stubs */}
      <line x1="0" y1="32" x2="10" y2="32" strokeWidth={3} opacity={0.5} />
      <line x1="54" y1="32" x2="64" y2="32" strokeWidth={3} opacity={0.5} />
      <line x1="32" y1="0" x2="32" y2="10" strokeWidth={3} opacity={0.5} />
      <line x1="32" y1="56" x2="32" y2="64" strokeWidth={3} opacity={0.5} />
      {/* Gauge body */}
      <circle cx="32" cy="32" r="22" strokeWidth={2.5} />
      <path d="M18 24a18 18 0 0 1 28 0" strokeWidth={1.5} strokeLinecap="round" />
      <line x1="32" y1="32" x2="42" y2="20" strokeWidth={2.5} strokeLinecap="round" />
      <circle cx="32" cy="32" r="3" fill="currentColor" />
      <text x="32" y="48" textAnchor="middle" fill="currentColor" fontSize="10" stroke="none" fontWeight="bold">P</text>
    </svg>
  ),
  reservoir: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={2}>
      {/* Connection stubs */}
      <line x1="0" y1="32" x2="6" y2="32" strokeWidth={3} opacity={0.5} />
      <line x1="58" y1="32" x2="64" y2="32" strokeWidth={3} opacity={0.5} />
      <line x1="32" y1="0" x2="32" y2="6" strokeWidth={3} opacity={0.5} />
      <line x1="32" y1="58" x2="32" y2="64" strokeWidth={3} opacity={0.5} />
      {/* Tank body */}
      <rect x="6" y="6" width="52" height="52" rx="3" strokeWidth={2.5} />
      <path d="M6 32h52" strokeDasharray="3 2" opacity={0.4} />
      <rect x="8" y="32" width="48" height="24" rx="2" fill="currentColor" opacity={0.1} stroke="none" />
      {/* Level ticks */}
      <line x1="2" y1="18" x2="6" y2="18" strokeWidth={1.5} />
      <line x1="2" y1="32" x2="6" y2="32" strokeWidth={1.5} />
      <line x1="2" y1="46" x2="6" y2="46" strokeWidth={1.5} />
    </svg>
  ),
  intake: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={2}>
      {/* Connection stubs */}
      <line x1="0" y1="24" x2="14" y2="24" strokeWidth={3} opacity={0.5} />
      <line x1="50" y1="24" x2="64" y2="24" strokeWidth={3} opacity={0.5} />
      <line x1="32" y1="50" x2="32" y2="64" strokeWidth={3} opacity={0.5} />
      {/* Intake screen/grate */}
      <rect x="14" y="8" width="36" height="32" rx="2" strokeWidth={2.5} />
      <line x1="22" y1="8" x2="22" y2="40" strokeWidth={1.5} />
      <line x1="32" y1="8" x2="32" y2="40" strokeWidth={1.5} />
      <line x1="42" y1="8" x2="42" y2="40" strokeWidth={1.5} />
      <line x1="14" y1="18" x2="50" y2="18" strokeWidth={1} />
      <line x1="14" y1="30" x2="50" y2="30" strokeWidth={1} />
      {/* Waves */}
      <path d="M4 50c4-3 8 3 12 0s8 3 12 0s8 3 12 0s8 3 12 0" strokeLinecap="round" opacity={0.6} />
      <path d="M4 58c4-3 8 3 12 0s8 3 12 0s8 3 12 0s8 3 12 0" strokeLinecap="round" opacity={0.3} />
    </svg>
  ),
  wtp: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={2}>
      {/* Connection stubs */}
      <line x1="0" y1="28" x2="4" y2="28" strokeWidth={3} opacity={0.5} />
      <line x1="0" y1="44" x2="4" y2="44" strokeWidth={3} opacity={0.5} />
      <line x1="60" y1="28" x2="64" y2="28" strokeWidth={3} opacity={0.5} />
      <line x1="60" y1="44" x2="64" y2="44" strokeWidth={3} opacity={0.5} />
      {/* Building */}
      <rect x="4" y="8" width="56" height="48" rx="3" strokeWidth={2.5} />
      <rect x="4" y="8" width="56" height="12" rx="3" fill="currentColor" opacity={0.12} stroke="currentColor" />
      {/* Filter layers */}
      <line x1="4" y1="32" x2="60" y2="32" strokeDasharray="4 2" opacity={0.3} />
      <line x1="4" y1="42" x2="60" y2="42" strokeDasharray="4 2" opacity={0.3} />
      {/* Treatment text */}
      <path d="M22 24h20M28 36h8M24 48h16" strokeWidth={1.5} strokeLinecap="round" opacity={0.5} />
    </svg>
  ),
  junction: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={2}>
      {/* Connection stubs to all edges */}
      <line x1="0" y1="32" x2="22" y2="32" strokeWidth={3} opacity={0.5} />
      <line x1="42" y1="32" x2="64" y2="32" strokeWidth={3} opacity={0.5} />
      <line x1="32" y1="0" x2="32" y2="22" strokeWidth={3} opacity={0.5} />
      <line x1="32" y1="42" x2="32" y2="64" strokeWidth={3} opacity={0.5} />
      {/* Center dot */}
      <circle cx="32" cy="32" r="10" fill="currentColor" opacity={0.2} stroke="currentColor" strokeWidth={2.5} />
      <circle cx="32" cy="32" r="5" fill="currentColor" />
    </svg>
  ),
  heat_exchanger: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={2}>
      {/* Connection stubs */}
      <line x1="0" y1="32" x2="10" y2="32" strokeWidth={3} opacity={0.5} />
      <line x1="54" y1="32" x2="64" y2="32" strokeWidth={3} opacity={0.5} />
      {/* Body */}
      <circle cx="32" cy="32" r="22" strokeWidth={2.5} />
      {/* Zigzag tubes */}
      <path d="M16 22l6 6-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M28 22l6 6-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M40 22l6 6-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  // ── PDAM-specific equipment ─────────────────────────────────

  aerator: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={2}>
      {/* Connection stubs */}
      <line x1="0" y1="32" x2="8" y2="32" strokeWidth={3} opacity={0.5} />
      <line x1="56" y1="32" x2="64" y2="32" strokeWidth={3} opacity={0.5} />
      <line x1="32" y1="0" x2="32" y2="8" strokeWidth={3} opacity={0.5} />
      <line x1="32" y1="56" x2="32" y2="64" strokeWidth={3} opacity={0.5} />
      {/* Basin */}
      <rect x="8" y="14" width="48" height="36" rx="3" strokeWidth={2.5} />
      {/* Water surface */}
      <path d="M8 28h48" strokeDasharray="4 2" opacity={0.3} />
      {/* Bubbles */}
      <circle cx="20" cy="38" r="3" opacity={0.3} fill="currentColor" />
      <circle cx="32" cy="34" r="4" opacity={0.3} fill="currentColor" />
      <circle cx="44" cy="40" r="2.5" opacity={0.3} fill="currentColor" />
      <circle cx="26" cy="42" r="2" opacity={0.2} fill="currentColor" />
      <circle cx="38" cy="44" r="1.5" opacity={0.2} fill="currentColor" />
      {/* Air inlet arrow */}
      <path d="M32 8v10M28 14l4-6 4 6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  ),

  filter: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={2}>
      {/* Connection stubs */}
      <line x1="0" y1="20" x2="8" y2="20" strokeWidth={3} opacity={0.5} />
      <line x1="56" y1="44" x2="64" y2="44" strokeWidth={3} opacity={0.5} />
      <line x1="32" y1="0" x2="32" y2="6" strokeWidth={3} opacity={0.5} />
      <line x1="32" y1="58" x2="32" y2="64" strokeWidth={3} opacity={0.5} />
      {/* Tank body */}
      <rect x="8" y="6" width="48" height="52" rx="3" strokeWidth={2.5} />
      {/* Filter layers */}
      <rect x="10" y="18" width="44" height="6" rx="1" fill="currentColor" opacity={0.08} stroke="currentColor" strokeWidth={1} />
      <rect x="10" y="26" width="44" height="8" rx="1" fill="currentColor" opacity={0.12} stroke="currentColor" strokeWidth={1} />
      <rect x="10" y="36" width="44" height="10" rx="1" fill="currentColor" opacity={0.18} stroke="currentColor" strokeWidth={1} />
      {/* Dots pattern (gravel) */}
      <circle cx="18" cy="41" r="1" fill="currentColor" opacity={0.3} />
      <circle cx="26" cy="39" r="1" fill="currentColor" opacity={0.3} />
      <circle cx="34" cy="42" r="1" fill="currentColor" opacity={0.3} />
      <circle cx="42" cy="40" r="1" fill="currentColor" opacity={0.3} />
      <circle cx="22" cy="44" r="1" fill="currentColor" opacity={0.3} />
      <circle cx="38" cy="44" r="1" fill="currentColor" opacity={0.3} />
      {/* Nozzle at bottom */}
      <path d="M24 50h16" strokeWidth={2} strokeLinecap="round" />
      <path d="M28 50v4M36 50v4" strokeWidth={1.5} />
      {/* Text */}
      <text x="32" y="15" textAnchor="middle" fill="currentColor" fontSize="8" stroke="none" fontWeight="bold" opacity={0.5}>FILTER</text>
    </svg>
  ),

  clarifier: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={2}>
      {/* Connection stubs */}
      <line x1="0" y1="24" x2="6" y2="24" strokeWidth={3} opacity={0.5} />
      <line x1="58" y1="24" x2="64" y2="24" strokeWidth={3} opacity={0.5} />
      <line x1="32" y1="56" x2="32" y2="64" strokeWidth={3} opacity={0.5} />
      {/* Main basin — trapezoidal */}
      <path d="M6 14h52v22l-10 20H16L6 36z" strokeWidth={2.5} strokeLinejoin="round" />
      {/* Water surface */}
      <path d="M6 24h52" strokeDasharray="3 2" opacity={0.4} />
      {/* Sludge zone */}
      <path d="M16 56l16-20 16 20" fill="currentColor" opacity={0.08} stroke="none" />
      {/* Center column */}
      <rect x="29" y="14" width="6" height="18" fill="currentColor" opacity={0.1} stroke="currentColor" strokeWidth={1.5} />
      {/* Scraper arms */}
      <line x1="20" y1="42" x2="44" y2="42" strokeWidth={1.5} opacity={0.5} />
      <line x1="32" y1="32" x2="32" y2="48" strokeWidth={1.5} opacity={0.5} />
    </svg>
  ),

  chemical_dosing: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={2}>
      {/* Connection stubs */}
      <line x1="0" y1="44" x2="12" y2="44" strokeWidth={3} opacity={0.5} />
      <line x1="52" y1="44" x2="64" y2="44" strokeWidth={3} opacity={0.5} />
      {/* Chemical tank */}
      <rect x="18" y="4" width="28" height="26" rx="3" strokeWidth={2.5} />
      <rect x="20" y="16" width="24" height="12" rx="1" fill="currentColor" opacity={0.1} stroke="none" />
      {/* Chemical symbol */}
      <text x="32" y="15" textAnchor="middle" fill="currentColor" fontSize="10" stroke="none" fontWeight="bold">Cl₂</text>
      {/* Dosing line */}
      <line x1="32" y1="30" x2="32" y2="44" strokeWidth={2} strokeDasharray="3 2" />
      {/* Dosing pump circle */}
      <circle cx="32" cy="44" r="8" strokeWidth={2} />
      <polygon points="32,38 38,46 26,46" fill="currentColor" opacity={0.15} stroke="currentColor" strokeWidth={1.5} />
      {/* Injection line */}
      <line x1="12" y1="44" x2="24" y2="44" strokeWidth={2} />
      <line x1="40" y1="44" x2="52" y2="44" strokeWidth={2} />
      {/* Drip indicator */}
      <path d="M32 52l-2 4a2 2 0 004 0z" fill="currentColor" opacity={0.3} />
    </svg>
  ),

  blower: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={2}>
      {/* Connection stubs */}
      <line x1="0" y1="32" x2="10" y2="32" strokeWidth={3} opacity={0.5} />
      <line x1="54" y1="32" x2="64" y2="32" strokeWidth={3} opacity={0.5} />
      <line x1="32" y1="56" x2="32" y2="64" strokeWidth={3} opacity={0.5} />
      {/* Main body — snail/volute shape */}
      <circle cx="32" cy="32" r="20" strokeWidth={2.5} />
      {/* Impeller blades */}
      <path d="M32 32l-8-12M32 32l12-4M32 32l-4 12M32 32l10 8" strokeWidth={2} strokeLinecap="round" opacity={0.5} />
      {/* Center hub */}
      <circle cx="32" cy="32" r="5" fill="currentColor" opacity={0.2} stroke="currentColor" strokeWidth={2} />
      {/* Outlet duct */}
      <rect x="48" y="26" width="6" height="12" rx="1" fill="currentColor" opacity={0.1} stroke="currentColor" strokeWidth={1.5} />
    </svg>
  ),

  check_valve: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={2}>
      {/* Connection stubs */}
      <line x1="0" y1="32" x2="14" y2="32" strokeWidth={3} opacity={0.5} />
      <line x1="50" y1="32" x2="64" y2="32" strokeWidth={3} opacity={0.5} />
      {/* Body — bowtie with check disc */}
      <polygon points="14,18 32,32 14,46" fill="currentColor" opacity={0.1} stroke="currentColor" strokeWidth={2} />
      <polygon points="50,18 32,32 50,46" fill="currentColor" opacity={0.1} stroke="currentColor" strokeWidth={2} />
      {/* Check disc (vertical line + hinge) */}
      <line x1="32" y1="16" x2="32" y2="48" strokeWidth={2.5} strokeLinecap="round" />
      {/* Flow arrow */}
      <path d="M20 52l6 0-3-4z" fill="currentColor" opacity={0.5} />
      <path d="M34 52l6 0-3-4z" fill="currentColor" opacity={0.5} />
      <path d="M18 54h24" strokeWidth={1} opacity={0.4} />
      <text x="32" y="60" textAnchor="middle" fill="currentColor" fontSize="7" stroke="none" opacity={0.5}>CV</text>
    </svg>
  ),

  ground_tank: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={2}>
      {/* Connection stubs */}
      <line x1="0" y1="30" x2="6" y2="30" strokeWidth={3} opacity={0.5} />
      <line x1="58" y1="30" x2="64" y2="30" strokeWidth={3} opacity={0.5} />
      <line x1="32" y1="0" x2="32" y2="6" strokeWidth={3} opacity={0.5} />
      {/* Ground line */}
      <path d="M0 54h64" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.4} />
      {/* Tank body — wide rectangular */}
      <rect x="6" y="10" width="52" height="44" rx="2" strokeWidth={2.5} />
      {/* Water level with waves */}
      <path d="M6 28c6-2 12 2 18 0s12 2 16 0s8 2 12 0" strokeWidth={1.5} opacity={0.5} />
      <rect x="8" y="28" width="48" height="24" rx="1" fill="currentColor" opacity={0.08} stroke="none" />
      {/* Level marks */}
      <line x1="2" y1="18" x2="6" y2="18" strokeWidth={1.5} opacity={0.5} />
      <line x1="2" y1="30" x2="6" y2="30" strokeWidth={1.5} opacity={0.5} />
      <line x1="2" y1="42" x2="6" y2="42" strokeWidth={1.5} opacity={0.5} />
    </svg>
  ),

  elevated_tank: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={2}>
      {/* Connection stubs */}
      <line x1="0" y1="20" x2="10" y2="20" strokeWidth={3} opacity={0.5} />
      <line x1="54" y1="20" x2="64" y2="20" strokeWidth={3} opacity={0.5} />
      <line x1="32" y1="58" x2="32" y2="64" strokeWidth={3} opacity={0.5} />
      {/* Tower legs */}
      <line x1="18" y1="34" x2="14" y2="58" strokeWidth={2.5} />
      <line x1="46" y1="34" x2="50" y2="58" strokeWidth={2.5} />
      <line x1="32" y1="34" x2="32" y2="58" strokeWidth={2} opacity={0.5} />
      {/* Cross braces */}
      <line x1="16" y1="46" x2="48" y2="46" strokeWidth={1.5} opacity={0.4} />
      <line x1="22" y1="40" x2="42" y2="52" strokeWidth={1} opacity={0.3} />
      <line x1="42" y1="40" x2="22" y2="52" strokeWidth={1} opacity={0.3} />
      {/* Tank bowl */}
      <path d="M10 14h44v12c0 6-8 10-22 10S10 32 10 26z" strokeWidth={2.5} strokeLinejoin="round" />
      {/* Water */}
      <path d="M12 20h40v6c0 5-7 9-20 9S12 31 12 26z" fill="currentColor" opacity={0.08} stroke="none" />
      {/* Wave */}
      <path d="M14 20c4-1 8 1 12 0s8 1 12 0s6 1 8 0" strokeWidth={1} opacity={0.4} />
    </svg>
  ),

  distribution: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={2}>
      {/* Connection stubs — many directions for distribution */}
      <line x1="0" y1="32" x2="16" y2="32" strokeWidth={3} opacity={0.5} />
      <line x1="48" y1="32" x2="64" y2="32" strokeWidth={3} opacity={0.5} />
      <line x1="32" y1="0" x2="32" y2="16" strokeWidth={3} opacity={0.5} />
      <line x1="32" y1="48" x2="32" y2="64" strokeWidth={3} opacity={0.5} />
      {/* Center hub */}
      <circle cx="32" cy="32" r="16" strokeWidth={2.5} />
      <circle cx="32" cy="32" r="6" fill="currentColor" opacity={0.15} stroke="currentColor" strokeWidth={1.5} />
      {/* Arrow heads pointing outward */}
      <path d="M48 32l-6-3v6z" fill="currentColor" opacity={0.4} />
      <path d="M16 32l6-3v6z" fill="currentColor" opacity={0.4} />
      <path d="M32 16l-3 6h6z" fill="currentColor" opacity={0.4} />
      <path d="M32 48l-3-6h6z" fill="currentColor" opacity={0.4} />
      {/* D text */}
      <text x="32" y="36" textAnchor="middle" fill="currentColor" fontSize="10" stroke="none" fontWeight="bold" opacity={0.5}>D</text>
    </svg>
  ),

  meter: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={2}>
      {/* Connection stubs */}
      <line x1="0" y1="32" x2="10" y2="32" strokeWidth={3} opacity={0.5} />
      <line x1="54" y1="32" x2="64" y2="32" strokeWidth={3} opacity={0.5} />
      {/* Meter body — rounded box */}
      <rect x="10" y="14" width="44" height="36" rx="6" strokeWidth={2.5} />
      {/* Display window */}
      <rect x="16" y="20" width="32" height="14" rx="2" fill="currentColor" opacity={0.06} stroke="currentColor" strokeWidth={1.5} />
      {/* Digits */}
      <text x="32" y="31" textAnchor="middle" fill="currentColor" fontSize="10" stroke="none" fontWeight="bold" fontFamily="monospace" opacity={0.6}>00385</text>
      {/* Unit label */}
      <text x="32" y="44" textAnchor="middle" fill="currentColor" fontSize="7" stroke="none" opacity={0.4}>m³</text>
    </svg>
  ),

  prv: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={2}>
      {/* Connection stubs */}
      <line x1="0" y1="36" x2="12" y2="36" strokeWidth={3} opacity={0.5} />
      <line x1="52" y1="36" x2="64" y2="36" strokeWidth={3} opacity={0.5} />
      <line x1="32" y1="0" x2="32" y2="10" strokeWidth={3} opacity={0.5} />
      {/* Valve body — bowtie */}
      <polygon points="12,22 32,36 12,50" fill="currentColor" opacity={0.1} stroke="currentColor" strokeWidth={2} />
      <polygon points="52,22 32,36 52,50" fill="currentColor" opacity={0.1} stroke="currentColor" strokeWidth={2} />
      {/* Actuator/spring dome */}
      <circle cx="32" cy="14" r="10" strokeWidth={2} />
      <line x1="32" y1="24" x2="32" y2="36" strokeWidth={2.5} />
      {/* Spring zigzag inside dome */}
      <path d="M28 10l2 2-2 2 2 2-2 2 2 2" strokeWidth={1.5} strokeLinecap="round" opacity={0.5} />
      {/* PRV text */}
      <text x="32" y="58" textAnchor="middle" fill="currentColor" fontSize="8" stroke="none" fontWeight="bold" opacity={0.5}>PRV</text>
    </svg>
  ),

  sludge: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={2}>
      {/* Connection stubs */}
      <line x1="0" y1="20" x2="8" y2="20" strokeWidth={3} opacity={0.5} />
      <line x1="56" y1="20" x2="64" y2="20" strokeWidth={3} opacity={0.5} />
      <line x1="32" y1="56" x2="32" y2="64" strokeWidth={3} opacity={0.5} />
      {/* Tank — funnel shaped */}
      <path d="M8 8h48v28l-14 20H22L8 36z" strokeWidth={2.5} strokeLinejoin="round" />
      {/* Sludge mass at bottom */}
      <path d="M22 56l10-14 10 14" fill="currentColor" opacity={0.15} stroke="none" />
      <path d="M10 28h44" strokeDasharray="3 2" opacity={0.3} />
      {/* Sludge particles */}
      <circle cx="20" cy="34" r="2" fill="currentColor" opacity={0.2} />
      <circle cx="32" cy="38" r="2.5" fill="currentColor" opacity={0.25} />
      <circle cx="44" cy="32" r="1.5" fill="currentColor" opacity={0.2} />
      <circle cx="26" cy="42" r="2" fill="currentColor" opacity={0.3} />
      <circle cx="38" cy="44" r="1.5" fill="currentColor" opacity={0.25} />
    </svg>
  ),

  motor: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={2}>
      {/* Connection stubs */}
      <line x1="0" y1="32" x2="8" y2="32" strokeWidth={3} opacity={0.5} />
      <line x1="56" y1="32" x2="64" y2="32" strokeWidth={3} opacity={0.5} />
      <line x1="32" y1="0" x2="32" y2="12" strokeWidth={3} opacity={0.5} />
      {/* Motor body — circle with M */}
      <circle cx="32" cy="32" r="20" strokeWidth={2.5} />
      <text x="32" y="39" textAnchor="middle" fill="currentColor" fontSize="20" stroke="none" fontWeight="bold">M</text>
      {/* Shaft */}
      <line x1="52" y1="32" x2="58" y2="32" strokeWidth={3} strokeLinecap="round" />
      {/* Terminal box */}
      <rect x="24" y="10" width="16" height="8" rx="2" fill="currentColor" opacity={0.1} stroke="currentColor" strokeWidth={1.5} />
      {/* Base/feet */}
      <line x1="16" y1="52" x2="48" y2="52" strokeWidth={2.5} strokeLinecap="round" />
      <line x1="20" y1="52" x2="20" y2="56" strokeWidth={2} />
      <line x1="44" y1="52" x2="44" y2="56" strokeWidth={2} />
    </svg>
  ),

  // ══════════════════════════════════════════════════════════════
  // ADDITIONAL SCHEMATIC GLYPHS (64x64 P&ID style)
  // ══════════════════════════════════════════════════════════════

  generator: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={2}>
      <line x1="0" y1="32" x2="10" y2="32" strokeWidth={3} opacity={0.5} />
      <line x1="54" y1="32" x2="64" y2="32" strokeWidth={3} opacity={0.5} />
      <circle cx="32" cy="32" r="22" strokeWidth={2.5} />
      <text x="32" y="40" textAnchor="middle" fill="currentColor" fontSize="22" stroke="none" fontWeight="bold">G</text>
    </svg>
  ),

  tank: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={2}>
      <line x1="0" y1="32" x2="8" y2="32" strokeWidth={3} opacity={0.5} />
      <line x1="56" y1="32" x2="64" y2="32" strokeWidth={3} opacity={0.5} />
      <line x1="32" y1="0" x2="32" y2="6" strokeWidth={3} opacity={0.5} />
      <line x1="32" y1="58" x2="32" y2="64" strokeWidth={3} opacity={0.5} />
      <rect x="8" y="6" width="48" height="52" rx="6" strokeWidth={2.5} />
      <path d="M8 28h48" strokeDasharray="3 2" opacity={0.4} />
      <rect x="10" y="28" width="44" height="28" rx="2" fill="currentColor" opacity={0.08} stroke="none" />
    </svg>
  ),

  alarm: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={2}>
      <path d="M28 8L8 52a4 4 0 003.4 6h41.2a4 4 0 003.4-6L36 8a4 4 0 00-8 0z" strokeWidth={2.5} />
      <path d="M32 24v12" strokeWidth={3} strokeLinecap="round" />
      <circle cx="32" cy="44" r="2" fill="currentColor" />
    </svg>
  ),

  level_sensor: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={2}>
      <line x1="32" y1="0" x2="32" y2="8" strokeWidth={3} opacity={0.5} />
      <line x1="32" y1="56" x2="32" y2="64" strokeWidth={3} opacity={0.5} />
      <rect x="10" y="8" width="44" height="48" rx="4" strokeWidth={2.5} />
      <path d="M10 36h44" strokeDasharray="3 2" opacity={0.4} />
      <rect x="12" y="36" width="40" height="18" fill="currentColor" opacity={0.1} stroke="none" />
      <text x="32" y="26" textAnchor="middle" fill="currentColor" fontSize="12" stroke="none" fontWeight="bold">LT</text>
    </svg>
  ),

  ph_sensor: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={2}>
      <line x1="32" y1="0" x2="32" y2="10" strokeWidth={3} opacity={0.5} />
      <rect x="14" y="10" width="36" height="48" rx="4" strokeWidth={2.5} />
      <circle cx="32" cy="28" r="12" strokeWidth={2} />
      <text x="32" y="33" textAnchor="middle" fill="currentColor" fontSize="12" stroke="none" fontWeight="bold">pH</text>
      <rect x="20" y="44" width="24" height="8" rx="2" fill="currentColor" opacity={0.1} stroke="currentColor" strokeWidth={1.5} />
    </svg>
  ),

  hydrant: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={2}>
      <line x1="32" y1="56" x2="32" y2="64" strokeWidth={3} opacity={0.5} />
      <rect x="22" y="26" width="20" height="30" rx="3" strokeWidth={2.5} />
      <circle cx="32" cy="16" r="10" strokeWidth={2.5} />
      <path d="M10 38h12M42 38h12" strokeWidth={2.5} strokeLinecap="round" />
      <line x1="20" y1="56" x2="44" y2="56" strokeWidth={2.5} />
    </svg>
  ),

  wwtp: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={2}>
      <line x1="0" y1="32" x2="6" y2="32" strokeWidth={3} opacity={0.5} />
      <line x1="58" y1="32" x2="64" y2="32" strokeWidth={3} opacity={0.5} />
      <rect x="6" y="14" width="52" height="36" rx="4" strokeWidth={2.5} />
      <circle cx="20" cy="32" r="10" fill="currentColor" opacity={0.1} stroke="currentColor" strokeWidth={2} />
      <circle cx="44" cy="32" r="10" fill="currentColor" opacity={0.1} stroke="currentColor" strokeWidth={2} />
      <path d="M30 32h4" strokeWidth={2} />
      <text x="32" y="58" textAnchor="middle" fill="currentColor" fontSize="8" stroke="none" fontWeight="bold">WWTP</text>
    </svg>
  ),

  water_tower: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={2}>
      <line x1="32" y1="58" x2="32" y2="64" strokeWidth={3} opacity={0.5} />
      <ellipse cx="32" cy="16" rx="22" ry="10" strokeWidth={2.5} />
      <path d="M10 16v8c0 5 10 9 22 9s22-4 22-9v-8" strokeWidth={2.5} />
      <line x1="16" y1="33" x2="12" y2="58" strokeWidth={2.5} />
      <line x1="48" y1="33" x2="52" y2="58" strokeWidth={2.5} />
      <line x1="32" y1="33" x2="32" y2="58" strokeWidth={2} opacity={0.5} />
      <line x1="14" y1="46" x2="50" y2="46" strokeWidth={1.5} opacity={0.4} />
    </svg>
  ),

  booster_station: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={2}>
      <line x1="0" y1="32" x2="8" y2="32" strokeWidth={3} opacity={0.5} />
      <line x1="56" y1="32" x2="64" y2="32" strokeWidth={3} opacity={0.5} />
      <rect x="8" y="18" width="48" height="28" rx="4" strokeWidth={2.5} />
      <circle cx="22" cy="32" r="10" strokeWidth={2} />
      <circle cx="42" cy="32" r="10" strokeWidth={2} />
      <polygon points="22,26 28,34 16,34" fill="currentColor" opacity={0.2} />
      <polygon points="42,26 48,34 36,34" fill="currentColor" opacity={0.2} />
    </svg>
  ),
}

// ── Icon SVGs per node type (card mode — smaller icons) ──────

export const NodeGlyph: Record<string, React.ReactNode> = {
  pump: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12l4-4 4 4M12 8v8" />
    </svg>
  ),
  valve: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <path d="M4 12h4l4-4 4 4h4"/>
      <rect x="10" y="8" width="4" height="8" rx="1" />
    </svg>
  ),
  flowmeter: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l4 2" />
    </svg>
  ),
  pressure: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="14" r="7" />
      <path d="M12 7V5M9 8.3L7.5 6.8M15 8.3L16.5 6.8" />
      <path d="M12 14 L14.5 11" strokeLinecap="round" />
    </svg>
  ),
  reservoir: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M3 12h18" strokeDasharray="2 2"/>
      <path d="M7 7V4M17 7V4" />
    </svg>
  ),
  intake: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <path d="M3 18c1-6 4-10 9-10s8 4 9 10" />
      <path d="M9 18v-4M12 18v-6M15 18v-4" />
    </svg>
  ),
  wtp: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="8" width="18" height="11" rx="2" />
      <path d="M3 12h18M9 8V5h6v3M8 15.5h8" />
    </svg>
  ),
  junction: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      <path d="M12 3v6M12 15v6M3 12h6M15 12h6" />
    </svg>
  ),
  heat_exchanger: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 8l2.5 2.5L7 13l2.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 8l2.5 2.5L12 13l2.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 8l-2 2 2 2-2 2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1.5 1.5" />
    </svg>
  ),

  // ── PDAM-specific equipment (card mode) ─────────────────────

  aerator: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="6" width="18" height="14" rx="2" />
      <path d="M3 12h18" strokeDasharray="2 2" opacity={0.4} />
      <circle cx="8" cy="15" r="1.5" fill="currentColor" opacity={0.3} />
      <circle cx="12" cy="14" r="2" fill="currentColor" opacity={0.3} />
      <circle cx="16" cy="16" r="1" fill="currentColor" opacity={0.3} />
      <path d="M12 3v3M10 5l2-2 2 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  filter: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <rect x="6" y="7" width="12" height="3" rx="0.5" fill="currentColor" opacity={0.08} stroke="currentColor" strokeWidth={1} />
      <rect x="6" y="11" width="12" height="3" rx="0.5" fill="currentColor" opacity={0.12} stroke="currentColor" strokeWidth={1} />
      <rect x="6" y="15" width="12" height="4" rx="0.5" fill="currentColor" opacity={0.18} stroke="currentColor" strokeWidth={1} />
      <text x="12" y="6" textAnchor="middle" fill="currentColor" fontSize="4" stroke="none" fontWeight="bold" opacity={0.5}>F</text>
    </svg>
  ),

  clarifier: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <path d="M3 5h18v8l-4 8H7L3 13z" strokeLinejoin="round" />
      <path d="M3 9h18" strokeDasharray="2 2" opacity={0.4} />
      <rect x="10" y="5" width="4" height="6" fill="currentColor" opacity={0.1} stroke="currentColor" strokeWidth={1} />
      <line x1="7" y1="15" x2="17" y2="15" strokeWidth={1} opacity={0.5} />
    </svg>
  ),

  chemical_dosing: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <rect x="7" y="2" width="10" height="10" rx="1.5" />
      <text x="12" y="9" textAnchor="middle" fill="currentColor" fontSize="5" stroke="none" fontWeight="bold">Cl</text>
      <line x1="12" y1="12" x2="12" y2="16" strokeDasharray="2 1" />
      <circle cx="12" cy="18" r="3" />
      <polygon points="12,16 14,19 10,19" fill="currentColor" opacity={0.15} stroke="currentColor" strokeWidth={1} />
      <path d="M4 18h5M19 18h-4" strokeLinecap="round" />
    </svg>
  ),

  blower: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" opacity={0.15} />
      <path d="M12 12l-3-5M12 12l5-1.5M12 12l-2 5M12 12l4 3.5" strokeWidth={1.5} strokeLinecap="round" opacity={0.5} />
      <rect x="18" y="9" width="3" height="6" rx="1" fill="currentColor" opacity={0.1} stroke="currentColor" strokeWidth={1} />
    </svg>
  ),

  check_valve: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <polygon points="4,7 12,12 4,17" fill="currentColor" opacity={0.1} stroke="currentColor" />
      <polygon points="20,7 12,12 20,17" fill="currentColor" opacity={0.1} stroke="currentColor" />
      <line x1="12" y1="6" x2="12" y2="18" strokeWidth={2} strokeLinecap="round" />
      <path d="M7 20l3-2 3 2 3-2 3 2" strokeWidth={1} opacity={0.4} />
    </svg>
  ),

  ground_tank: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      <path d="M3 11c3-1 6 1 9 0s6 1 9 0" strokeWidth={1} opacity={0.5} />
      <rect x="4" y="11" width="16" height="8" rx="0.5" fill="currentColor" opacity={0.08} stroke="none" />
      <line x1="1" y1="8" x2="3" y2="8" strokeWidth={1.5} />
      <line x1="1" y1="12" x2="3" y2="12" strokeWidth={1.5} />
      <line x1="1" y1="16" x2="3" y2="16" strokeWidth={1.5} />
    </svg>
  ),

  elevated_tank: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <path d="M5 5h14v5c0 2-3 3-7 3s-7-1-7-3z" />
      <path d="M6 8h12" strokeWidth={0.8} opacity={0.4} />
      <line x1="8" y1="13" x2="6" y2="21" strokeWidth={1.5} />
      <line x1="16" y1="13" x2="18" y2="21" strokeWidth={1.5} />
      <line x1="12" y1="13" x2="12" y2="21" strokeWidth={1} opacity={0.4} />
      <line x1="7" y1="17" x2="17" y2="17" strokeWidth={1} opacity={0.3} />
    </svg>
  ),

  distribution: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" fill="currentColor" opacity={0.2} />
      <path d="M18 12l-3-1.5v3zM6 12l3-1.5v3zM12 6l-1.5 3h3zM12 18l-1.5-3h3z" fill="currentColor" opacity={0.4} />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" strokeLinecap="round" />
    </svg>
  ),

  meter: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="6" width="18" height="12" rx="3" />
      <rect x="5" y="8" width="14" height="5" rx="1" fill="currentColor" opacity={0.06} stroke="currentColor" strokeWidth={1} />
      <text x="12" y="12" textAnchor="middle" fill="currentColor" fontSize="4.5" stroke="none" fontWeight="bold" fontFamily="monospace" opacity={0.6}>0385</text>
      <text x="12" y="16.5" textAnchor="middle" fill="currentColor" fontSize="3" stroke="none" opacity={0.4}>m³</text>
    </svg>
  ),

  prv: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <polygon points="4,9 12,14 4,19" fill="currentColor" opacity={0.1} stroke="currentColor" />
      <polygon points="20,9 12,14 20,19" fill="currentColor" opacity={0.1} stroke="currentColor" />
      <circle cx="12" cy="6" r="4" />
      <line x1="12" y1="10" x2="12" y2="14" strokeWidth={2} />
      <path d="M10 5l1 1-1 1 1 1" strokeWidth={1} opacity={0.5} />
    </svg>
  ),

  sludge: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <path d="M3 4h18v10l-5 7H8L3 14z" strokeLinejoin="round" />
      <path d="M3 10h18" strokeDasharray="2 2" opacity={0.3} />
      <circle cx="8" cy="13" r="1" fill="currentColor" opacity={0.25} />
      <circle cx="12" cy="15" r="1.5" fill="currentColor" opacity={0.3} />
      <circle cx="16" cy="12" r="1" fill="currentColor" opacity={0.2} />
    </svg>
  ),

  motor: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="8" />
      <text x="12" y="16" textAnchor="middle" fill="currentColor" fontSize="10" stroke="none" fontWeight="bold">M</text>
      <line x1="20" y1="12" x2="23" y2="12" strokeWidth={2} strokeLinecap="round" />
      <rect x="9" y="2" width="6" height="3" rx="1" fill="currentColor" opacity={0.1} stroke="currentColor" strokeWidth={1} />
      <line x1="7" y1="20" x2="17" y2="20" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  ),

  // ══════════════════════════════════════════════════════════════
  // ADDITIONAL NODE GLYPHS (for new icon types)
  // ══════════════════════════════════════════════════════════════

  generator: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="8" />
      <text x="12" y="16" textAnchor="middle" fill="currentColor" fontSize="10" stroke="none" fontWeight="bold">G</text>
    </svg>
  ),

  gate_valve: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <polygon points="4,8 12,12 4,16" fill="currentColor" opacity={0.1} />
      <polygon points="20,8 12,12 20,16" fill="currentColor" opacity={0.1} />
      <rect x="10" y="4" width="4" height="6" rx="0.5" />
      <line x1="12" y1="10" x2="12" y2="12" />
    </svg>
  ),

  butterfly_valve: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="8" />
      <ellipse cx="12" cy="12" rx="2" ry="6" fill="currentColor" opacity={0.15} transform="rotate(30 12 12)" />
      <line x1="12" y1="4" x2="12" y2="2" />
    </svg>
  ),

  solenoid_valve: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <polygon points="4,9 12,12 4,15" fill="currentColor" opacity={0.1} />
      <polygon points="20,9 12,12 20,15" fill="currentColor" opacity={0.1} />
      <rect x="9" y="3" width="6" height="8" rx="1" />
      <path d="M10 5h4M10 7h4M10 9h4" strokeWidth={0.75} opacity={0.5} />
    </svg>
  ),

  level_sensor: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 14h16" strokeDasharray="2 2" opacity={0.4} />
      <rect x="5" y="14" width="14" height="5" fill="currentColor" opacity={0.1} />
      <path d="M12 2v2M12 20v2" strokeLinecap="round" />
    </svg>
  ),

  ph_sensor: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <rect x="6" y="3" width="12" height="18" rx="2" />
      <circle cx="12" cy="9" r="4" />
      <text x="12" y="11" textAnchor="middle" fill="currentColor" fontSize="5" stroke="none" fontWeight="bold">pH</text>
      <rect x="8" y="15" width="8" height="3" rx="1" fill="currentColor" opacity={0.1} />
    </svg>
  ),

  turbidity_sensor: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <circle cx="12" cy="10" r="4" fill="currentColor" opacity={0.1} />
      <path d="M9 10l6 0M12 7v6" strokeWidth={1} opacity={0.5} />
      <text x="12" y="18" textAnchor="middle" fill="currentColor" fontSize="4" stroke="none">NTU</text>
    </svg>
  ),

  chlorine_sensor: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <text x="12" y="14" textAnchor="middle" fill="currentColor" fontSize="8" stroke="none" fontWeight="bold">Cl</text>
    </svg>
  ),

  temperature_sensor: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <path d="M12 2a3 3 0 00-3 3v9.4a5 5 0 103.5 8.6h-.5a5 5 0 103.5-8.6V5a3 3 0 00-3-3z" />
      <circle cx="12" cy="17" r="3" fill="currentColor" opacity={0.2} />
      <path d="M12 7v7" />
    </svg>
  ),

  conductivity_sensor: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <rect x="6" y="4" width="12" height="16" rx="2" />
      <path d="M9 8v8M15 8v8" strokeWidth={2} />
      <path d="M9 12h6" strokeDasharray="1 1" opacity={0.5} />
    </svg>
  ),

  do_sensor: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <text x="12" y="14" textAnchor="middle" fill="currentColor" fontSize="6" stroke="none" fontWeight="bold">O₂</text>
    </svg>
  ),

  tank: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <rect x="5" y="4" width="14" height="16" rx="3" />
      <path d="M5 10h14" />
      <path d="M9 14h6" strokeDasharray="2 2" />
    </svg>
  ),

  water_tower: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <ellipse cx="12" cy="7" rx="8" ry="4" />
      <path d="M4 7v3c0 2.2 3.6 4 8 4s8-1.8 8-4V7" />
      <line x1="8" y1="14" x2="6" y2="22" />
      <line x1="16" y1="14" x2="18" y2="22" />
      <line x1="12" y1="14" x2="12" y2="22" />
    </svg>
  ),

  sedimentation: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M2 12h20" strokeDasharray="2 2" opacity={0.3} />
      <circle cx="6" cy="15" r="1" fill="currentColor" opacity={0.3} />
      <circle cx="10" cy="16" r="1.5" fill="currentColor" opacity={0.3} />
      <circle cx="15" cy="15" r="1" fill="currentColor" opacity={0.3} />
      <circle cx="19" cy="16" r="0.8" fill="currentColor" opacity={0.3} />
    </svg>
  ),

  uv_disinfection: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <rect x="4" y="6" width="16" height="12" rx="2" />
      <line x1="8" y1="12" x2="16" y2="12" strokeWidth={2} />
      <path d="M10 8l-2 4 2 4M14 8l2 4-2 4" strokeWidth={1} opacity={0.5} />
    </svg>
  ),

  ozone: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="8" />
      <text x="12" y="15" textAnchor="middle" fill="currentColor" fontSize="7" stroke="none" fontWeight="bold">O₃</text>
    </svg>
  ),

  softener: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <rect x="5" y="3" width="14" height="18" rx="3" />
      <circle cx="12" cy="11" r="4" fill="currentColor" opacity={0.1} />
      <path d="M9 11h6M12 8v6" strokeWidth={0.8} opacity={0.5} />
      <rect x="8" y="17" width="8" height="2" rx="0.5" />
    </svg>
  ),

  dma: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 12h18" opacity={0.3} />
      <path d="M8 8v8M12 6v12M16 8v8" strokeWidth={1} opacity={0.5} />
      <text x="12" y="20" textAnchor="middle" fill="currentColor" fontSize="4" stroke="none">DMA</text>
    </svg>
  ),

  hydrant: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <path d="M8 20h8" />
      <rect x="9" y="10" width="6" height="10" rx="1" />
      <path d="M6 14h3M15 14h3" />
      <circle cx="12" cy="6" r="4" />
    </svg>
  ),

  customer_meter: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <rect x="4" y="6" width="16" height="10" rx="2" />
      <text x="12" y="13" textAnchor="middle" fill="currentColor" fontSize="5" stroke="none" fontFamily="monospace">m³</text>
      <path d="M8 16v4M16 16v4M6 20h12" />
    </svg>
  ),

  booster_station: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="8" width="18" height="10" rx="2" />
      <circle cx="8" cy="13" r="3" />
      <circle cx="16" cy="13" r="3" />
      <path d="M5 13l2-2M5 13l2 2M13 13l2-2M13 13l2 2" strokeWidth={1} />
    </svg>
  ),

  alarm: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  ),

  indicator: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" fill="currentColor" opacity={0.2} />
    </svg>
  ),

  status_light: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="6" fill="currentColor" opacity={0.2} />
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2" strokeLinecap="round" opacity={0.5} />
    </svg>
  ),

  wwtp: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="7" cy="12" r="3" fill="currentColor" opacity={0.1} />
      <circle cx="17" cy="12" r="3" fill="currentColor" opacity={0.1} />
      <path d="M10 12h4" />
    </svg>
  ),

  septic_tank: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <path d="M3 8c0-2 2-4 9-4s9 2 9 4v10c0 2-2 4-9 4s-9-2-9-4z" />
      <path d="M3 12h18" strokeDasharray="2 2" opacity={0.4} />
      <ellipse cx="12" cy="8" rx="9" ry="3.5" />
    </svg>
  ),

  lift_station: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <rect x="4" y="8" width="16" height="12" rx="2" />
      <circle cx="12" cy="14" r="4" />
      <path d="M10 14l2-2 2 2M12 12v4" />
      <path d="M8 8V5h8v3" />
    </svg>
  ),

  manhole: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <ellipse cx="12" cy="12" rx="9" ry="5" />
      <path d="M3 12v4c0 2.8 4 5 9 5s9-2.2 9-5v-4" />
      <line x1="8" y1="12" x2="8" y2="16" opacity={0.5} />
      <line x1="16" y1="12" x2="16" y2="16" opacity={0.5} />
    </svg>
  ),

  grease_trap: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <line x1="10" y1="6" x2="10" y2="18" />
      <line x1="14" y1="6" x2="14" y2="18" />
      <rect x="4" y="8" width="5" height="3" fill="currentColor" opacity={0.15} />
    </svg>
  ),

  pipe_straight: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <rect x="2" y="9" width="20" height="6" rx="1" />
      <line x1="2" y1="12" x2="22" y2="12" strokeDasharray="3 2" opacity={0.3} />
    </svg>
  ),

  pipe_elbow: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <path d="M4 9h8c3 0 5 2 5 5v6" />
      <path d="M4 15h6c2 0 3-1 3-3v-3" />
    </svg>
  ),

  pipe_tee: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <rect x="2" y="9" width="20" height="6" rx="1" />
      <rect x="9" y="15" width="6" height="7" rx="1" />
    </svg>
  ),

  reducer: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <path d="M2 8h6l4 2h6l4 2" />
      <path d="M2 16h6l4-2h6l4-2" />
      <line x1="2" y1="8" x2="2" y2="16" />
      <line x1="22" y1="10" x2="22" y2="14" />
    </svg>
  ),

  expansion_joint: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <rect x="2" y="9" width="7" height="6" rx="1" />
      <rect x="15" y="9" width="7" height="6" rx="1" />
      <path d="M9 12c1 0 1.5-2 3-2s2 4 3 4 1.5-2 0-2" strokeDasharray="2 1" />
    </svg>
  ),

  compressor: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="8" />
      <text x="12" y="15" textAnchor="middle" fill="currentColor" fontSize="8" stroke="none" fontWeight="bold">C</text>
    </svg>
  ),

  fan: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <path d="M12 4c2 2 2 4 0 6M20 12c-2 2-4 2-6 0M12 20c-2-2-2-4 0-6M4 12c2-2 4-2 6 0" strokeWidth={2} />
    </svg>
  ),

  strainer: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <polygon points="4,9 12,12 4,15" fill="currentColor" opacity={0.1} />
      <polygon points="20,9 12,12 20,15" fill="currentColor" opacity={0.1} />
      <line x1="10" y1="8" x2="10" y2="16" strokeDasharray="1 1" />
      <line x1="12" y1="7" x2="12" y2="17" strokeDasharray="1 1" />
      <line x1="14" y1="8" x2="14" y2="16" strokeDasharray="1 1" />
    </svg>
  ),

  air_release: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="14" r="6" />
      <path d="M12 8V3M10 5l2-2 2 2" />
      <circle cx="10" cy="14" r="1" fill="currentColor" opacity={0.3} />
      <circle cx="14" cy="13" r="1.5" fill="currentColor" opacity={0.3} />
      <circle cx="12" cy="16" r="1" fill="currentColor" opacity={0.3} />
    </svg>
  ),

  break_tank: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <rect x="4" y="6" width="16" height="14" rx="2" />
      <path d="M4 11h16" strokeDasharray="2 2" />
      <path d="M2 11h2M20 11h2" />
      <path d="M12 2v4" />
    </svg>
  ),

  sampling_point: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="8" r="5" />
      <rect x="10" y="13" width="4" height="8" rx="1" />
      <path d="M10 17h4" />
      <text x="12" y="10" textAnchor="middle" fill="currentColor" fontSize="5" stroke="none">S</text>
    </svg>
  ),

  solar_panel: (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={1.5}>
      <rect x="2" y="6" width="20" height="12" rx="1" />
      <path d="M2 10h20M2 14h20M8 6v12M14 6v12" strokeWidth={0.75} />
      <path d="M12 2v4M6 3l2 3M18 3l-2 3" strokeLinecap="round" opacity={0.5} />
    </svg>
  ),
}

// ── ViewMode Tooltip Card ─────────────────────────────────────

function NodeTooltipCard({
  nodeType,
  label,
  status,
  runtime,
  onClose,
  anchorRef,
}: {
  nodeType: string
  label: string
  status: RuntimeStatus
  runtime: NodeRuntimeState | null | undefined
  onClose: () => void
  anchorRef: React.RefObject<HTMLDivElement | null>
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  // Compute position from anchor element
  useEffect(() => {
    const updatePos = () => {
      if (!anchorRef.current) return
      const rect = anchorRef.current.getBoundingClientRect()
      setPos({
        top: rect.top - 8,   // 8px gap above node
        left: rect.left + rect.width / 2,
      })
    }
    updatePos()
    // Re-position on scroll / zoom
    window.addEventListener('scroll', updatePos, true)
    window.addEventListener('resize', updatePos)
    return () => {
      window.removeEventListener('scroll', updatePos, true)
      window.removeEventListener('resize', updatePos)
    }
  }, [anchorRef])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      // Ignore clicks inside the tooltip itself
      if (ref.current && ref.current.contains(target)) return
      // Ignore clicks on the anchor node — let its onClick toggle handle it
      if (anchorRef.current && anchorRef.current.contains(target)) return
      onClose()
    }
    // delay to avoid immediate close from the click that opened it
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 100)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', handler)
    }
  }, [onClose, anchorRef])

  const displayValue = runtime?.primaryValue != null
    ? runtime.primaryValue.toFixed(runtime.primaryPrecision ?? 1)
    : null
  const displayUnit = runtime?.primaryUnit ?? ''

  if (!pos) return null

  return createPortal(
    <div
      ref={ref}
      className="nodrag nopan"
      style={{
        position: 'fixed',
        zIndex: 99999,
        left: pos.left,
        top: pos.top,
        transform: 'translate(-50%, -100%)',
        minWidth: 180,
        pointerEvents: 'auto',
      }}
    >
      <div className="bg-surface border border-surface-border rounded-xl shadow-panel p-3 text-left">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${STATUS_DOT[status]}`} />
            <span className="text-xs font-semibold text-[var(--text-primary)]">{label}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-[9px] font-semibold uppercase ${STATUS_COLOR_TEXT[status]}`}>
              {STATUS_LABEL[status]}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onClose() }}
              className="w-4 h-4 flex items-center justify-center rounded hover:bg-surface-border text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              title="Close"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M2 2l6 6M8 2l-6 6" />
              </svg>
            </button>
          </div>
        </div>

        <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
          {nodeType}
        </div>

        {/* Primary value */}
        {displayValue !== null ? (
          <div className="bg-canvas rounded-lg px-2.5 py-1.5 mb-2 border border-surface-border">
            <span className="value-display text-base text-[var(--text-primary)] font-semibold">
              {displayValue}
            </span>
            {displayUnit && (
              <span className="value-display text-xs text-[var(--text-muted)] ml-1">
                {displayUnit}
              </span>
            )}
            {runtime?.primaryTimestamp && (
              <div className="text-[9px] text-[var(--text-muted)] mt-0.5 font-mono">
                {new Date(runtime.primaryTimestamp).toLocaleTimeString()}
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs text-[var(--text-muted)] py-1 mb-2">No live data</div>
        )}

        {/* All bindings */}
        {runtime && runtime.allBindings.length > 0 && (
          <div className="flex flex-col gap-1">
            {runtime.allBindings.map((b) => (
              <div key={b.bindingId} className="flex items-center justify-between py-0.5 text-[10px]">
                <span className="text-[var(--text-secondary)] truncate max-w-[90px]">
                  {b.displayLabel ?? b.bindingKey}
                </span>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-[var(--text-primary)]">
                    {b.value != null ? b.value.toFixed(b.precision ?? 1) : '—'}
                  </span>
                  {(b.unitOverride ?? b.unit) && (
                    <span className="text-[var(--text-muted)]">{b.unitOverride ?? b.unit}</span>
                  )}
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[b.status] ?? 'bg-gray-600'}`} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Arrow */}
      <div className="w-2.5 h-2.5 bg-surface border-r border-b border-surface-border rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-[6px]" />
    </div>,
    document.body,
  )
}

// ── InlineEditLabel ───────────────────────────────────────────

function InlineEditLabel({
  label,
  nodeId,
  maxWidth,
  fontSize = 10,
}: {
  label: string
  nodeId: string
  maxWidth: number
  fontSize?: number
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(label)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync external label changes
  useEffect(() => {
    if (!editing) setValue(label)
  }, [label, editing])

  const commit = useCallback(() => {
    setEditing(false)
    const trimmed = value.trim()
    if (trimmed && trimmed !== label) {
      useDiagramStore.getState().updateNode(nodeId, { label: trimmed })
    } else {
      setValue(label) // revert
    }
  }, [value, label, nodeId])

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') {
      setValue(label)
      setEditing(false)
    }
    // prevent canvas shortcuts while editing
    e.stopPropagation()
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="nodrag nopan bg-canvas border border-accent rounded text-center text-[var(--text-primary)] outline-none px-1 py-0"
        style={{ width: Math.max(40, maxWidth - 8), fontSize }}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        autoFocus
      />
    )
  }

  return (
    <span
      className="font-medium text-[var(--text-secondary)] leading-tight block truncate max-w-full cursor-text"
      style={{ maxWidth: maxWidth - 8, fontSize }}
      onDoubleClick={handleDoubleClick}
      title="Double-click to edit"
    >
      {label}
    </span>
  )
}

// ── Component ─────────────────────────────────────────────────

// ── Live equipment helpers (data-driven symbols) ──────────────

const PUMP_TYPES = new Set(['pump', 'motor', 'booster_station', 'blower', 'compressor'])
const TANK_TYPES = new Set(['reservoir', 'ground_tank', 'elevated_tank', 'tank', 'water_tower', 'break_tank'])
// Instrument types that can render an inline live analog dial (needle sweeps with value)
const DIAL_TYPES = new Set(['pressure', 'flowmeter', 'ph_sensor', 'turbidity_sensor', 'chlorine_sensor', 'do_sensor', 'conductivity_sensor', 'temperature_sensor'])

// Stable empty fallbacks — never return a fresh {} / [] from a zustand v5
// selector (a new reference each render triggers "Maximum update depth exceeded")
const EMPTY_CONFIG: Record<string, unknown> = {}
const EMPTY_STYLE: NodeStyleConfig = {}
const EMPTY_BINDINGS: ScadaNodeBinding[] = []

// Body bounds (viewBox 0..64) per tank glyph, for the water-fill overlay
const TANK_BODY: Record<string, { x: number; w: number; top: number; bottom: number; bowl?: boolean }> = {
  reservoir:     { x: 8,  w: 48, top: 8,  bottom: 56 },
  ground_tank:   { x: 8,  w: 48, top: 12, bottom: 52 },
  elevated_tank: { x: 12, w: 40, top: 15, bottom: 35, bowl: true },
  tank:          { x: 8,  w: 48, top: 10, bottom: 54 },
  water_tower:   { x: 12, w: 40, top: 15, bottom: 35, bowl: true },
  break_tank:    { x: 8,  w: 48, top: 12, bottom: 52 },
}

function toNum(v?: number | null): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function fmtBinding(b?: ScadaRuntimeBindingDto | null, fallbackPrec = 0): string | null {
  const v = toNum(b?.value)
  if (v == null) return null
  return v.toFixed(b?.precision ?? fallbackPrec)
}

interface PumpLive {
  running: boolean | null   // null = unknown (offline/stale/no data)
  fault: boolean
  rpmB?: ScadaRuntimeBindingDto
  headB?: ScadaRuntimeBindingDto
}

function resolvePumpLive(bindings: ScadaRuntimeBindingDto[], primaryStatus: RuntimeStatus): PumpLive {
  const statusB = bindings.find(
    (b) => b.category === 'pump_status' || /(^|[_-])(status|run|running|state|onoff|on_off)([_-]|$)/i.test(b.bindingKey),
  )
  const rpmB = bindings.find(
    (b) => b.category === 'rpm' || b.category === 'pump_speed' || /rpm|speed/i.test(b.bindingKey),
  )
  const headB = bindings.find(
    (b) => b.category === 'head' || b.category === 'head_loss' || /head/i.test(b.bindingKey),
  )
  const fault = primaryStatus === 'alert'
  let running: boolean | null = null
  const sv = toNum(statusB?.value)
  if (statusB && sv != null) running = sv !== 0
  else if (primaryStatus === 'off') running = false
  else if (primaryStatus === 'ok' || primaryStatus === 'warn' || primaryStatus === 'alert') running = true
  return { running, fault, rpmB, headB }
}

// Resolve tank fill percentage (0..100) from a level binding + optional geometry config
function resolveTankFillPct(
  bindings: ScadaRuntimeBindingDto[],
  primaryValue: number | null | undefined,
  config: Record<string, unknown>,
  preferChannelId?: string | null,
): number | null {
  // A binding explicitly set to chartType 'inline' wins; otherwise auto-detect a level binding
  const levelB = (preferChannelId ? bindings.find((b) => b.sensorChannelId === preferChannelId) : undefined)
    ?? bindings.find((b) => b.category === 'level' || /level/i.test(b.bindingKey))
  const value = toNum(levelB?.value) ?? toNum(primaryValue)
  if (value == null) return null
  const unit = (levelB?.unitOverride ?? levelB?.unit ?? '').trim()
  const min = toNum(config.levelMin as number) ?? 0
  const max = toNum(config.levelMax as number)
  let pct: number | null = null
  if (unit === '%') pct = value
  else if (max != null && max > min) pct = ((value - min) / (max - min)) * 100
  else if (unit === '' && value >= 0 && value <= 100) pct = value
  if (pct == null) return null
  return Math.max(0, Math.min(100, pct))
}

// Fraction 0..1 for an inline instrument dial, from the value + optional min/max scale
function resolveDialPct(
  bindings: ScadaRuntimeBindingDto[],
  channelId: string | null,
  min: number | null,
  max: number | null,
  primaryValue: number | null | undefined,
): number | null {
  const b = channelId ? bindings.find((x) => x.sensorChannelId === channelId) : undefined
  const v = toNum(b?.value) ?? toNum(primaryValue)
  if (v == null) return null
  const lo = min ?? 0
  const hi = (max != null && max > lo) ? max : Math.max(lo + 1, v * 1.4) // auto-scale when max unset
  return Math.max(0, Math.min(1, (v - lo) / (hi - lo)))
}

// Live analog dial — a 270° gauge whose needle + colored arc track the value (SCADA-style)
function PressureDialLive({ pct, color, uid, value }: { pct: number; color: string; uid: string; value?: string | null }) {
  const CX = 32, CY = 31, R = 17, START = 135, SWEEP = 270
  const p = Math.max(0, Math.min(1, pct))
  const NEEDLE = '#f1f5f9' // bright, contrasts with the status-colored arc
  const gid = `dialglow-${uid}`
  const polar = (deg: number, rad = R) => {
    const r = (deg * Math.PI) / 180
    return { x: CX + rad * Math.cos(r), y: CY + rad * Math.sin(r) }
  }
  const arc = (from: number, to: number) => {
    const a0 = START + SWEEP * from
    const a1 = START + SWEEP * to
    const s = polar(a0), e = polar(a1)
    const large = a1 - a0 > 180 ? 1 : 0
    return `M ${s.x} ${s.y} A ${R} ${R} 0 ${large} 1 ${e.x} ${e.y}`
  }
  // Minor tick marks around the scale
  const ticks = Array.from({ length: 9 }, (_, i) => {
    const a = START + (SWEEP * i) / 8
    const o = polar(a, R + 3.5)
    const inn = polar(a, R + 1)
    const major = i % 2 === 0
    return { x1: inn.x, y1: inn.y, x2: o.x, y2: o.y, major }
  })
  const needleDeg = START + SWEEP * p
  return (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <defs>
        <filter id={gid} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
      </defs>
      {/* connection stubs */}
      <line x1="32" y1="49" x2="32" y2="64" stroke="currentColor" strokeWidth={3} opacity={0.4} />
      <line x1="0"  y1="31" x2="12" y2="31" stroke="currentColor" strokeWidth={3} opacity={0.4} />
      <line x1="52" y1="31" x2="64" y2="31" stroke="currentColor" strokeWidth={3} opacity={0.4} />
      {/* dial face — subtle filled disc for depth */}
      <circle cx={CX} cy={CY} r={R + 4} fill="#0b1220" fillOpacity={0.55} stroke="currentColor" strokeOpacity={0.22} strokeWidth={1} />
      {/* tick marks */}
      {ticks.map((t, i) => (
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="currentColor" strokeWidth={t.major ? 1.4 : 0.8} opacity={t.major ? 0.5 : 0.28} strokeLinecap="round" />
      ))}
      {/* track */}
      <path d={arc(0, 1)} stroke="currentColor" strokeOpacity={0.16} strokeWidth={4.5} strokeLinecap="round" />
      {/* value arc — soft glow behind + crisp arc on top */}
      <path d={arc(0, Math.max(0.001, p))} stroke={color} strokeWidth={7} strokeLinecap="round" opacity={0.35} filter={`url(#${gid})`} />
      <path d={arc(0, Math.max(0.001, p))} stroke={color} strokeWidth={4.5} strokeLinecap="round" />
      {/* needle — tapered, bright, with counterweight tail; rotated to value */}
      <g transform={`translate(${CX} ${CY}) rotate(${needleDeg})`}>
        <polygon points={`${R - 3},0 0,-1.9 -5.5,0 0,1.9`} fill={NEEDLE} />
        <polygon points={`${R - 3},0 0,-0.9 0,0.9`} fill={color} opacity={0.9} />
      </g>
      {/* hub — layered: status ring + dark core + bright center */}
      <circle cx={CX} cy={CY} r={4.2} fill="#0b1220" stroke={color} strokeWidth={1.6} />
      <circle cx={CX} cy={CY} r={1.5} fill={NEEDLE} />
      {/* live value — digital readout in the lower opening of the dial */}
      {value != null && (
        <text
          x={CX} y={CY + 11}
          textAnchor="middle"
          fontSize={6.5}
          fontWeight={700}
          fill={NEEDLE}
          stroke="#0b1220"
          strokeWidth={0.4}
          paintOrder="stroke"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {value}
        </text>
      )}
    </svg>
  )
}

// Animated pump symbol — impeller spins while running (SMIL, no CSS dependency)
function PumpGlyphLive({ running }: { running: boolean }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth={2}>
      <line x1="0" y1="32" x2="12" y2="32" strokeWidth={3} opacity={0.5} />
      <line x1="52" y1="32" x2="64" y2="32" strokeWidth={3} opacity={0.5} />
      <line x1="32" y1="0" x2="32" y2="12" strokeWidth={3} opacity={0.5} />
      <line x1="32" y1="52" x2="32" y2="64" strokeWidth={3} opacity={0.5} />
      <circle cx="32" cy="32" r="20" strokeWidth={2.5} />
      <g>
        <polygon points="32,16 46,38 18,38" fill="currentColor" opacity={0.18} stroke="currentColor" strokeWidth={2} />
        {running && (
          <animateTransform
            attributeName="transform"
            attributeType="XML"
            type="rotate"
            from="0 32 32"
            to="360 32 32"
            dur="1.6s"
            repeatCount="indefinite"
          />
        )}
      </g>
    </svg>
  )
}

// Water-fill overlay drawn on top of a static tank glyph (aligned via shared viewBox)
function TankWaterOverlay({ nodeType, fillPct, color, uid }: { nodeType: string; fillPct: number; color: string; uid: string }) {
  const b = TANK_BODY[nodeType] ?? TANK_BODY.reservoir
  const h = ((b.bottom - b.top) * fillPct) / 100
  const y = b.bottom - h
  const clipId = `tankwater-${uid}`
  return (
    <svg viewBox="0 0 64 64" className="absolute inset-0 w-full h-full pointer-events-none" style={{ color }} aria-hidden>
      <defs>
        <clipPath id={clipId}>
          {b.bowl ? (
            <path d="M10 14h44v12c0 6-8 10-22 10S10 32 10 26z" />
          ) : (
            <rect x={b.x} y={b.top} width={b.w} height={b.bottom - b.top} rx={2} />
          )}
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect x={b.x - 3} y={y} width={b.w + 6} height={h + 3} fill="currentColor" opacity={0.42} />
        {/* surface wave */}
        <path
          d={`M${b.x - 3} ${y} q 5 -2.5 10 0 t 10 0 t 10 0 t 10 0 t 10 0`}
          stroke="currentColor"
          strokeWidth={1.2}
          fill="none"
          opacity={0.6}
        />
      </g>
    </svg>
  )
}

interface ScadaNodeFrameProps {
  id: string
  nodeType: string
  label: string
  selected?: boolean
  runtime?: NodeRuntimeState | null
  isEditMode?: boolean
  width?: number
  height?: number
  sensorCategory?: string   // for sensor nodes: category key from SENSOR_CATEGORIES
  children?: React.ReactNode
}

export function ScadaNodeFrame({
  id,
  nodeType,
  label,
  selected = false,
  runtime,
  isEditMode = false,
  width = 100,
  height = 100,
  sensorCategory,
}: ScadaNodeFrameProps) {
  const status: RuntimeStatus = runtime?.primaryStatus ?? 'unknown'
  const ringClass = STATUS_RING[status] ?? STATUS_RING.unknown
  const dotClass  = STATUS_DOT[status]  ?? STATUS_DOT.unknown

  // Resolve glyph: sensor category icon → custom SVG → builtin glyph
  const catDef    = sensorCategory ? getSensorCategory(sensorCategory) : null
  const glyph     = catDef?.icon ?? NodeGlyph[nodeType] ?? NodeGlyph.junction

  const displayValue = runtime?.primaryValue != null
    ? runtime.primaryValue.toFixed(runtime.primaryPrecision ?? 1)
    : null

  const displayUnit = runtime?.primaryUnit ?? ''

  // Tooltip state — centralized in store so only ONE tooltip shows at a time
  const activeTooltipNodeId = useUiStore((s) => s.activeTooltipNodeId)
  const toggleTooltipNodeId = useUiStore((s) => s.toggleTooltipNodeId)
  const setActiveTooltipNodeId = useUiStore((s) => s.setActiveTooltipNodeId)
  const showTooltip = activeTooltipNodeId === id
  const nodeAnchorRef = useRef<HTMLDivElement>(null)

  const handleNodeClick = useCallback(() => {
    if (!isEditMode) {
      toggleTooltipNodeId(id)
    }
  }, [isEditMode, id, toggleTooltipNodeId])

  const handleCloseTooltip = useCallback(() => setActiveTooltipNodeId(null), [setActiveTooltipNodeId])

  // Close tooltip when switching modes
  useEffect(() => {
    if (isEditMode && showTooltip) setActiveTooltipNodeId(null)
  }, [isEditMode, showTooltip, setActiveTooltipNodeId])

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    useDiagramStore.getState().removeNode(id)
  }

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation()
    const store = useDiagramStore.getState()
    const orig = store.nodes.find((n) => n.id === id)
    if (!orig) return
    store.addNode({
      ...orig,
      id: crypto.randomUUID(),
      label: `${orig.label} copy`,
      position: { x: orig.position.x + 30, y: orig.position.y + 30 },
    })
  }

  const handleConfigure = (e: React.MouseEvent) => {
    e.stopPropagation()
    useUiStore.getState().openNodeConfig(id)
  }

  // Read custom style config from store (raw ref → stable empty fallback)
  const styleRaw = useDiagramStore(
    (s) => s.nodes.find((nd) => nd.id === id)?.style
  )
  const styleConfig: NodeStyleConfig = (styleRaw as NodeStyleConfig | undefined) ?? EMPTY_STYLE
  // Displayed symbol is decoupled from the node's type: `glyphKey` overrides the icon
  // for presentation only. Behavior (tank fill, pump animation, category badge) always
  // follows the real nodeType, never glyphKey.
  const glyphType = styleConfig.glyphKey ?? nodeType
  const cardGlyph = catDef?.icon ?? NodeGlyph[glyphType] ?? NodeGlyph.junction

  // Read bindings from store (for showTrend flag)
  const bindingsRaw = useDiagramStore(
    (s) => s.nodes.find((nd) => nd.id === id)?.bindings
  )
  const nodeBindings: ScadaNodeBinding[] = bindingsRaw ?? EMPTY_BINDINGS

  // Read freeform node config (tank geometry etc.) — select the RAW ref
  // (stable across renders); coalesce to a shared empty object outside the selector
  const nodeConfigRaw = useDiagramStore(
    (s) => s.nodes.find((nd) => nd.id === id)?.config
  )
  const nodeConfig = (nodeConfigRaw as Record<string, unknown> | undefined) ?? EMPTY_CONFIG

  // ── Live equipment state (data-driven pump / tank symbols) ──
  const allBindings = runtime?.allBindings ?? []
  const isPumpType = PUMP_TYPES.has(nodeType)
  const isTankType = TANK_TYPES.has(nodeType)
  const isDialType = DIAL_TYPES.has(nodeType)
  const pumpLive = isPumpType ? resolvePumpLive(allBindings, status) : null
  // Binding explicitly set to 'inline' drives the tank fill / live dial
  const inlineBinding = nodeBindings.find((b) => b.chartType === 'inline')
  const inlineChannelId = inlineBinding?.sensorChannelId ?? null
  const tankPct  = isTankType ? resolveTankFillPct(allBindings, runtime?.primaryValue, nodeConfig, inlineChannelId) : null
  // Live analog dial (pressure/flow/instruments) — needle position 0..1
  const dialPct = (isDialType && inlineBinding)
    ? resolveDialPct(allBindings, inlineChannelId, inlineBinding.gaugeMin ?? null, inlineBinding.gaugeMax ?? null, runtime?.primaryValue)
    : null
  // Numeric value shown inside the dial (digital manometer look)
  const dialRt = inlineChannelId ? allBindings.find((b) => b.sensorChannelId === inlineChannelId) : undefined
  const dialValueNum = toNum(dialRt?.value) ?? toNum(runtime?.primaryValue)
  const dialValueText = dialValueNum != null
    ? dialValueNum.toFixed(dialRt?.precision ?? runtime?.primaryPrecision ?? 1)
    : null
  // Is the inline live dial actually shown for this node?
  const dialActive = isDialType && dialPct != null && glyphType === nodeType
  // Show/hide the live value text under the icon. When the dial is active the value is
  // already inside the dial, so the bottom label defaults to hidden (toggle to re-enable).
  const showValue = dialActive
    ? (inlineBinding?.dialShowLabel === true)
    : (styleConfig.showValue !== false)
  const pumpRpmText  = pumpLive?.rpmB ? fmtBinding(pumpLive.rpmB, 0) : null
  const pumpHeadText = pumpLive?.headB ? fmtBinding(pumpLive.headB, 1) : null

  // Find primary binding with showTrend enabled
  const trendBinding = nodeBindings.find((b) => b.showTrend && (b.isPrimary || nodeBindings.length === 1))
    || nodeBindings.find((b) => b.showTrend)
  const trendChannelId = trendBinding?.sensorChannelId
  const trendPoints = useTrendStore((s) => trendChannelId ? s.trends[trendChannelId]?.points ?? null : null)

  const trendActive = !!(trendPoints && trendPoints.length >= 2)
  const trendChartH = 70

  // Chart type per binding: 'line' (needs history) or 'gauge' (instantaneous)
  const chartType = trendBinding?.chartType ?? 'line'
  const chartRuntime = trendChannelId
    ? allBindings.find((b) => b.sensorChannelId === trendChannelId)
    : undefined
  const lineActive  = chartType === 'line' && trendActive
  const gaugeActive = chartType === 'gauge' && !!trendBinding
  const chartActive = lineActive || gaugeActive
  const chartTransparent = trendBinding?.chartTransparent === true
  const gaugeValue  = chartRuntime?.value ?? runtime?.primaryValue ?? null
  const gaugeUnit   = chartRuntime?.unitOverride ?? chartRuntime?.unit ?? runtime?.primaryUnit ?? ''
  const gaugeStatusColor =
    (chartRuntime?.status ?? status) === 'alert' ? 'var(--status-alert)'
    : (chartRuntime?.status ?? status) === 'warn' ? 'var(--status-warn)'
    : (chartRuntime?.status ?? status) === 'ok' ? 'var(--status-ok)'
    : '#64748b'

  const renderMode: NodeRenderMode = styleConfig.renderMode ?? 'card'
  const hasCustomSvg = styleConfig.iconMode === 'custom' && !!styleConfig.customSvg

  // Resolve icon position and visibility
  const iconPos = styleConfig.iconPosition ?? 'top'
  const showIcon = iconPos !== 'hidden'
  const isHorizontalLayout = iconPos === 'left' || iconPos === 'right'

  // Border settings
  const showBorder = styleConfig.showBorder !== false
  const borderW = showBorder ? (styleConfig.borderWidth ?? 1) : 0

  // Background image
  const hasBgImage = !!styleConfig.bgImage

  // Dynamic glyph size — user override or auto-scale with node
  const glyphSize = styleConfig.iconSize ?? Math.max(20, Math.min(40, Math.min(width, height) * 0.35))

  // Font sizes — user override or defaults
  const labelFs = styleConfig.labelFontSize ?? 10
  const valueFs = styleConfig.valueFontSize ?? Math.max(10, Math.min(18, Math.min(width, height) * 0.14))

  // ── SCHEMATIC render mode ──────────────────────────────────
  // SVG fills 100% of node — NO gap between symbol and edge handles.
  // Label and value are positioned BELOW the node (overflow visible).
  if (renderMode === 'schematic') {
    // Symbol variant (user-selectable per node); follows glyphType (icon override), not the data type
    const variantList = SCHEMATIC_VARIANTS[glyphType]
    const variantGlyph = variantList
      ? (variantList[styleConfig.glyphVariant ?? 0] ?? variantList[0])
      : undefined
    const baseSchematicGlyph = catDef?.icon ?? variantGlyph ?? SchematicGlyph[glyphType] ?? SchematicGlyph.junction ?? cardGlyph
    // Inline live dial for instruments (needle sweeps with value) — behavior follows type
    const schematicGlyph = (isDialType && dialPct != null && glyphType === nodeType)
      ? <PressureDialLive pct={dialPct} color={gaugeStatusColor} uid={id} value={dialValueText} />
      // Animated impeller for the default pump style; other picked styles render static
      : (nodeType === 'pump' && glyphType === 'pump' && !catDef && (styleConfig.glyphVariant ?? 0) === 0)
        ? <PumpGlyphLive running={pumpLive?.running === true} />
        : baseSchematicGlyph
    const schemLabelFs = styleConfig.labelFontSize ?? Math.max(9, Math.min(12, width * 0.1))
    const schemValueFs = styleConfig.valueFontSize ?? Math.max(12, Math.min(20, width * 0.16))
    const labelPlacement = styleConfig.labelPlacement ?? 'bottom'
    // Pump/motor accent reflects run state: green=run, gray=stop, red=fault
    const pumpAccent = isPumpType
      ? (pumpLive?.fault ? 'var(--status-alert)'
        : pumpLive?.running === true ? 'var(--status-ok)'
        : pumpLive?.running === false ? '#6b7280'
        : undefined)
      : undefined
    const accentColor = styleConfig.accentColor
      || (catDef ? catDef.color : undefined)
      || pumpAccent
      || (status === 'alert' ? 'var(--status-alert)' : undefined)
      || (status === 'ok' ? 'var(--status-ok)' : undefined)
      || '#94a3b8'
    const tankWaterColor = styleConfig.accentColor || '#38bdf8'

    // ── Label/Value info block (reused in different positions) ──
    const infoBlock = (
      <>
        {/* Live value */}
        {displayValue !== null && showValue && (
          <div className="whitespace-nowrap">
            <span
              className="value-display text-[var(--text-primary)] font-bold tabular-nums"
              style={{ fontSize: schemValueFs }}
            >
              {displayValue}
            </span>
            {displayUnit && (
              <span
                className="value-display text-[var(--text-muted)] ml-0.5"
                style={{ fontSize: Math.max(8, schemValueFs - 3) }}
              >
                {displayUnit}
              </span>
            )}
          </div>
        )}

        {/* Pump sub-values: RPM + head */}
        {(pumpRpmText || pumpHeadText) && (
          <div
            className="whitespace-nowrap text-[var(--text-muted)] tabular-nums leading-tight"
            style={{ fontSize: Math.max(8, schemLabelFs - 1) }}
          >
            {pumpRpmText && (
              <span className="mr-1.5">{pumpRpmText} {pumpLive?.rpmB?.unitOverride ?? pumpLive?.rpmB?.unit ?? 'RPM'}</span>
            )}
            {pumpHeadText && (
              <span>H {pumpHeadText} {pumpLive?.headB?.unitOverride ?? pumpLive?.headB?.unit ?? 'm'}</span>
            )}
          </div>
        )}

        {/* Label */}
        <div className="pointer-events-auto">
          {isEditMode ? (
            <InlineEditLabel
              label={label}
              nodeId={id}
              maxWidth={Math.max(width, 120)}
              fontSize={schemLabelFs}
            />
          ) : (
            <span
              className="font-medium text-[var(--text-secondary)] leading-tight block"
              style={{ fontSize: schemLabelFs }}
            >
              {label}
            </span>
          )}
        </div>

        {/* Status badge */}
        {status !== 'ok' && status !== 'unknown' && displayValue !== null && (
          <div className={[
            'inline-block text-[8px] font-bold px-1.5 py-0.5 rounded-full mt-0.5',
            STATUS_COLOR_TEXT[status] ?? '',
          ].join(' ')}
            style={{ backgroundColor: accentColor + '15' }}
          >
            {STATUS_LABEL[status]}
          </div>
        )}


      </>
    )

    // ── Position styles for the info block ──
    const infoPositionStyle: React.CSSProperties = (() => {
      switch (labelPlacement) {
        case 'center':
          return {
            position: 'absolute' as const,
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            whiteSpace: 'nowrap',
          }
        case 'top':
          return {
            position: 'absolute' as const,
            bottom: '100%', left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: 2,
            textAlign: 'center',
            whiteSpace: 'nowrap',
          }
        case 'left':
          return {
            position: 'absolute' as const,
            right: '100%', top: '50%',
            transform: 'translateY(-50%)',
            marginRight: 6,
            textAlign: 'right',
            whiteSpace: 'nowrap',
          }
        case 'right':
          return {
            position: 'absolute' as const,
            left: '100%', top: '50%',
            transform: 'translateY(-50%)',
            marginLeft: 6,
            textAlign: 'left',
            whiteSpace: 'nowrap',
          }
        case 'bottom':
        default:
          return {
            position: 'absolute' as const,
            top: '100%', left: '50%',
            transform: 'translateX(-50%)',
            marginTop: 2,
            textAlign: 'center',
            whiteSpace: 'nowrap',
          }
      }
    })()

    return (
      <>
        {/* View mode tooltip — portalled to body */}
        {showTooltip && !isEditMode && (
          <NodeTooltipCard
            nodeType={nodeType}
            label={label}
            status={status}
            runtime={runtime}
            onClose={handleCloseTooltip}
            anchorRef={nodeAnchorRef}
          />
        )}

        {/* Chart above the node (schematic mode): line trend OR gauge */}
        {chartActive && (
          <div
            className="absolute overflow-hidden"
            style={{
              left: '50%',
              bottom: height,
              transform: 'translateX(-50%)',
              width: Math.max(140, width * 1.2),
              height: trendChartH,
              backgroundColor: chartTransparent ? 'transparent' : 'rgba(15,23,42,0.85)',
              border: chartTransparent ? 'none' : '1px solid rgba(51,65,85,0.5)',
              borderTopLeftRadius: chartTransparent ? 0 : 8,
              borderTopRightRadius: chartTransparent ? 0 : 8,
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              zIndex: 1,
            }}
          >
            {chartType === 'gauge' ? (
              <Gauge
                value={gaugeValue}
                min={trendBinding?.gaugeMin ?? 0}
                max={trendBinding?.gaugeMax ?? undefined}
                unit={gaugeUnit}
                precision={chartRuntime?.precision ?? runtime?.primaryPrecision ?? 1}
                color={gaugeStatusColor}
                width={Math.max(140, width * 1.2) - 2}
                height={trendChartH - 1}
              />
            ) : (
              <TrendCard
                data={trendPoints!}
                hours={trendBinding?.trendHours ?? 1}
                color={accentColor}
                width={Math.max(140, width * 1.2) - 2}
                height={trendChartH - 1}
                hideHeader
                transparent
                compact
              />
            )}
          </div>
        )}

        {/* Node container — SVG fills 100%, label/value overflow */}
        <div
          ref={nodeAnchorRef}
          onClick={handleNodeClick}
          className={[
            'relative cursor-pointer transition-all duration-200',
            isEditMode ? 'scada-node-edit' : 'scada-node-view',
          ].join(' ')}
          style={{
            width,
            height,
            overflow: 'visible',
            opacity: styleConfig.opacity ?? 1,
          }}
        >
          {/* P&ID Glyph — fills 100% of node, flush with handles */}
          <div
            className="transition-colors duration-200"
            style={{
              width: '100%',
              height: '100%',
              color: accentColor,
              filter: selected ? `drop-shadow(0 0 8px ${accentColor}55)` : undefined,
            }}
          >
            {hasCustomSvg ? (
              <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: styleConfig.customSvg! }} />
            ) : (
              schematicGlyph
            )}
          </div>

          {/* Tank water fill overlay (data-driven level %) */}
          {isTankType && tankPct != null && !hasCustomSvg && (
            <TankWaterOverlay nodeType={nodeType} fillPct={tankPct} color={tankWaterColor} uid={id} />
          )}
          {isTankType && tankPct != null && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span
                className="value-display font-bold tabular-nums"
                style={{
                  fontSize: Math.max(10, Math.min(22, width * 0.16)),
                  color: '#ffffff',
                  textShadow: '0 1px 3px rgba(0,0,0,0.7)',
                }}
              >
                {Math.round(tankPct)}%
              </span>
            </div>
          )}

          {/* Status dot — top-right corner */}
          <div className="absolute -top-1 -right-1 z-10">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${dotClass}`} />
          </div>

          {/* ── Info block (value + label + badge) ── */}
          <div
            className="pointer-events-none"
            style={infoPositionStyle}
          >
            {labelPlacement === 'center' && (
              <div
                className="rounded-md px-1.5 py-0.5"
                style={{ backgroundColor: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)' }}
              >
                {infoBlock}
              </div>
            )}
            {labelPlacement !== 'center' && infoBlock}
          </div>
        </div>

        {/* 12 Handles — 3 per side for flexible connection placement */}
        {/* Top side */}
        <Handle type="source" position={Position.Top} id="tl" className="scada-handle !z-[10]" style={{ left: '15%' }} />
        <Handle type="source" position={Position.Top} id="t"  className="scada-handle !z-[10]" />
        <Handle type="source" position={Position.Top} id="tr" className="scada-handle !z-[10]" style={{ left: '85%' }} />
        {/* Right side */}
        <Handle type="source" position={Position.Right} id="rt" className="scada-handle !z-[10]" style={{ top: '15%' }} />
        <Handle type="source" position={Position.Right} id="r"  className="scada-handle !z-[10]" />
        <Handle type="source" position={Position.Right} id="rb" className="scada-handle !z-[10]" style={{ top: '85%' }} />
        {/* Bottom side */}
        <Handle type="source" position={Position.Bottom} id="bl" className="scada-handle !z-[10]" style={{ left: '15%' }} />
        <Handle type="source" position={Position.Bottom} id="b"  className="scada-handle !z-[10]" />
        <Handle type="source" position={Position.Bottom} id="br" className="scada-handle !z-[10]" style={{ left: '85%' }} />
        {/* Left side */}
        <Handle type="source" position={Position.Left} id="lt" className="scada-handle !z-[10]" style={{ top: '15%' }} />
        <Handle type="source" position={Position.Left} id="l"  className="scada-handle !z-[10]" />
        <Handle type="source" position={Position.Left} id="lb" className="scada-handle !z-[10]" style={{ top: '85%' }} />

        {/* Toolbar */}
        {isEditMode && selected && (
          <div
            className="absolute -top-9 left-1/2 -translate-x-1/2 flex gap-1 bg-surface border border-surface-border rounded-lg px-1 py-0.5 shadow-panel nodrag nopan"
            style={{ zIndex: 20 }}
          >
            <button onClick={handleConfigure} className="p-1 rounded hover:bg-accent/20 text-[var(--text-secondary)] hover:text-accent transition-colors" title="Configure node">
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="8" cy="8" r="3" /><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4" strokeLinecap="round" /></svg>
            </button>
            <button onClick={handleDuplicate} className="p-1 rounded hover:bg-accent/20 text-[var(--text-secondary)] hover:text-accent transition-colors" title="Duplikat">
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5}><rect x="2" y="4" width="8" height="8" rx="1" /><path d="M6 4V2.5A.5.5 0 016.5 2H13.5a.5.5 0 01.5.5V9.5a.5.5 0 01-.5.5H12" /></svg>
            </button>
            <button onClick={handleDelete} className="p-1 rounded hover:bg-red-500/20 text-[var(--text-secondary)] hover:text-status-alert transition-colors" title="Hapus (Del)">
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M5 3h6M4 5h8l-.7 8a1 1 0 01-1 .9H5.7a1 1 0 01-1-.9L4 5z" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        )}
      </>
    )
  }

  // ── CARD render mode (original) ────────────────────────────

  return (
    <>
      {/* View mode tooltip — portalled to body */}
      {showTooltip && !isEditMode && (
        <NodeTooltipCard
          nodeType={nodeType}
          label={label}
          status={status}
          runtime={runtime}
          onClose={handleCloseTooltip}
          anchorRef={nodeAnchorRef}
        />
      )}

      {/* Chart above the node (card mode): line trend OR gauge */}
      {chartActive && (
        <div
          className="absolute overflow-hidden"
          style={{
            left: 0,
            bottom: height - borderW,
            width,
            height: trendChartH,
            backgroundColor: chartTransparent ? 'transparent' : (hasBgImage ? 'rgba(15,23,42,0.85)' : (styleConfig.bgColor || 'var(--surface-bg)')),
            borderStyle: 'solid',
            borderWidth: chartTransparent ? 0 : borderW,
            borderColor: chartTransparent ? 'transparent' : (showBorder ? (styleConfig.borderColor || 'var(--surface-border)') : 'transparent'),
            borderTopLeftRadius: chartTransparent ? 0 : (styleConfig.borderRadius ?? 12),
            borderTopRightRadius: chartTransparent ? 0 : (styleConfig.borderRadius ?? 12),
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            borderBottomWidth: 0,
          }}
        >
          {chartType === 'gauge' ? (
            <Gauge
              value={gaugeValue}
              min={trendBinding?.gaugeMin ?? 0}
              max={trendBinding?.gaugeMax ?? 100}
              unit={gaugeUnit}
              precision={chartRuntime?.precision ?? runtime?.primaryPrecision ?? 1}
              color={gaugeStatusColor}
              width={width - borderW * 2}
              height={trendChartH - borderW}
            />
          ) : (
            <TrendCard
              data={trendPoints!}
              hours={trendBinding?.trendHours ?? 1}
              color={styleConfig.accentColor || (catDef ? catDef.color : '#22d3ee')}
              width={width - borderW * 2}
              height={trendChartH - borderW}
              hideHeader
              transparent
              compact
            />
          )}
        </div>
      )}

      {/* Node body — dynamic size */}
      <div
        ref={nodeAnchorRef}
        onClick={handleNodeClick}
        className={[
          'relative flex items-center overflow-hidden',
          isHorizontalLayout ? 'flex-row' : 'flex-col justify-start',
          'cursor-pointer',
          'transition-all duration-200',
          showBorder ? ringClass : '',
          showBorder && selected ? 'ring-2 ring-accent shadow-node-selected' : showBorder ? 'ring-1' : '',
          !showBorder && selected ? 'shadow-node-selected' : '',
          isEditMode ? 'hover:border-accent/40' : 'hover:brightness-110',
          isEditMode ? 'scada-node-edit' : 'scada-node-view',
        ].join(' ')}
        style={{
          width,
          height,
          backgroundColor: hasBgImage ? 'transparent' : (styleConfig.bgColor || 'var(--surface-bg)'),
          borderStyle: 'solid',
          borderWidth: borderW,
          borderColor: showBorder ? (styleConfig.borderColor || 'var(--surface-border)') : 'transparent',
          borderTopLeftRadius: chartActive ? 0 : (styleConfig.borderRadius ?? 12),
          borderTopRightRadius: chartActive ? 0 : (styleConfig.borderRadius ?? 12),
          borderBottomLeftRadius: styleConfig.borderRadius ?? 12,
          borderBottomRightRadius: styleConfig.borderRadius ?? 12,
          opacity: styleConfig.opacity ?? 1,
          ...(hasBgImage ? {
            backgroundImage: `url(${styleConfig.bgImage})`,
            backgroundSize: styleConfig.bgImageFit ?? 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          } : {}),
        }}
      >
        {/* BG overlay for readability when image bg is set */}
        {hasBgImage && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundColor: styleConfig.bgColor || 'rgba(15,23,42,0.55)',
              borderRadius: (styleConfig.borderRadius ?? 12) - borderW,
            }}
          />
        )}
        {/* Status dot */}
        <div className="absolute top-1.5 right-1.5 z-10">
          <span className={`inline-block w-2 h-2 rounded-full ${dotClass}`} />
        </div>

        {/* Content area — flex direction depends on iconPosition */}
        <div
          className={[
            'relative flex items-center z-[1] w-full h-full',
            isHorizontalLayout ? 'flex-row' : 'flex-col justify-start',
          ].join(' ')}
          style={{ padding: isHorizontalLayout ? '4px 6px' : '0' }}
        >
          {/* Glyph icon — scales with node size, position-aware */}
          {showIcon && (iconPos === 'top' || iconPos === 'center' || iconPos === 'left') && (
            <div
              className={[
                'flex-shrink-0 transition-colors duration-200',
                iconPos === 'top' ? 'mt-2' : '',
                iconPos === 'center' ? 'mt-auto' : '',
                isHorizontalLayout ? 'mr-1.5' : '',
                !styleConfig.accentColor && !catDef && status === 'alert'   ? 'text-status-alert' : '',
                !styleConfig.accentColor && !catDef && status === 'warn'    ? 'text-status-warn'  : '',
                !styleConfig.accentColor && !catDef && status === 'ok'      ? 'text-status-ok'    : '',
                !styleConfig.accentColor && !catDef && status === 'offline' ? 'text-gray-600'     : '',
                !styleConfig.accentColor && !catDef && !['alert','warn','ok','offline'].includes(status) ? 'text-gray-300' : '',
              ].join(' ')}
              style={{
                width: glyphSize,
                height: glyphSize,
                ...(styleConfig.accentColor
                  ? { color: styleConfig.accentColor }
                  : catDef
                    ? { color: catDef.color }
                    : {}),
              }}
            >
              {hasCustomSvg ? (
                <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: styleConfig.customSvg! }} />
              ) : (
                cardGlyph
              )}
            </div>
          )}

          {/* Text content (value + label) */}
          <div
            className={[
              'flex flex-col min-w-0',
              iconPos === 'center' ? 'mb-auto items-center w-full' : '',
              iconPos === 'top' ? 'items-center w-full' : '',
              isHorizontalLayout ? 'flex-1 overflow-hidden' : '',
            ].join(' ')}
          >
            {/* Live value */}
            {displayValue !== null && showValue && (
              <div className={['mt-1 px-1', isHorizontalLayout ? 'text-left' : 'text-center'].join(' ')}>
                <span
                  className="value-display text-[var(--text-primary)] font-semibold"
                  style={{ fontSize: valueFs }}
                >
                  {displayValue}
                </span>
                {displayUnit && (
                  <span
                    className="value-display text-[var(--text-muted)] ml-0.5"
                    style={{ fontSize: Math.max(8, valueFs - 2) }}
                  >
                    {displayUnit}
                  </span>
                )}
              </div>
            )}



            {/* Label — inline editable in edit mode */}
            <div
              className={['mt-1 px-1 pb-1.5', isHorizontalLayout ? 'text-left' : 'text-center'].join(' ')}
              style={{ maxWidth: isHorizontalLayout ? undefined : width }}
            >
              {isEditMode ? (
                <InlineEditLabel label={label} nodeId={id} maxWidth={isHorizontalLayout ? width - glyphSize - 16 : width} fontSize={labelFs} />
              ) : (
                <span
                  className="font-medium text-[var(--text-secondary)] leading-tight block truncate max-w-full"
                  style={{ maxWidth: isHorizontalLayout ? width - glyphSize - 16 : width - 8, fontSize: labelFs }}
                >
                  {label}
                </span>
              )}
            </div>
          </div>

          {/* Icon on right side */}
          {showIcon && iconPos === 'right' && (
            <div
              className={[
                'flex-shrink-0 ml-1.5 transition-colors duration-200',
                !styleConfig.accentColor && !catDef && status === 'alert'   ? 'text-status-alert' : '',
                !styleConfig.accentColor && !catDef && status === 'warn'    ? 'text-status-warn'  : '',
                !styleConfig.accentColor && !catDef && status === 'ok'      ? 'text-status-ok'    : '',
                !styleConfig.accentColor && !catDef && status === 'offline' ? 'text-gray-600'     : '',
                !styleConfig.accentColor && !catDef && !['alert','warn','ok','offline'].includes(status) ? 'text-gray-300' : '',
              ].join(' ')}
              style={{
                width: glyphSize,
                height: glyphSize,
                ...(styleConfig.accentColor
                  ? { color: styleConfig.accentColor }
                  : catDef
                    ? { color: catDef.color }
                    : {}),
              }}
            >
              {hasCustomSvg ? (
                <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: styleConfig.customSvg! }} />
              ) : (
                cardGlyph
              )}
            </div>
          )}
        </div>

        {/* Sensor category badge */}
        {catDef && catDef.key !== 'generic' && (
          <div
            className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[7px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap z-[1]"
            style={{
              backgroundColor: catDef.color + '20',
              color: catDef.color,
              maxWidth: width - 8,
            }}
          >
            {catDef.unit || catDef.label}
          </div>
        )}

        {/* Status badge — only for non-ok states */}
        {status !== 'ok' && status !== 'unknown' && displayValue !== null && (
          <div className={[
            'absolute bottom-0.5 left-1/2 -translate-x-1/2 z-[1]',
            'text-[8px] font-semibold px-1 rounded',
            STATUS_COLOR_TEXT[status] ?? '',
          ].join(' ')}>
            {STATUS_LABEL[status]}
          </div>
        )}
      </div>

      {/* 12 Handles — 3 per side for flexible edge connection placement */}
      <Handle type="source" position={Position.Top}    id="tl" className="scada-handle !z-[10]" style={{ left: '15%' }} />
      <Handle type="source" position={Position.Top}    id="t"  className="scada-handle !z-[10]" />
      <Handle type="source" position={Position.Top}    id="tr" className="scada-handle !z-[10]" style={{ left: '85%' }} />
      <Handle type="source" position={Position.Right}  id="rt" className="scada-handle !z-[10]" style={{ top: '15%' }} />
      <Handle type="source" position={Position.Right}  id="r"  className="scada-handle !z-[10]" />
      <Handle type="source" position={Position.Right}  id="rb" className="scada-handle !z-[10]" style={{ top: '85%' }} />
      <Handle type="source" position={Position.Bottom} id="bl" className="scada-handle !z-[10]" style={{ left: '15%' }} />
      <Handle type="source" position={Position.Bottom} id="b"  className="scada-handle !z-[10]" />
      <Handle type="source" position={Position.Bottom} id="br" className="scada-handle !z-[10]" style={{ left: '85%' }} />
      <Handle type="source" position={Position.Left}   id="lt" className="scada-handle !z-[10]" style={{ top: '15%' }} />
      <Handle type="source" position={Position.Left}   id="l"  className="scada-handle !z-[10]" />
      <Handle type="source" position={Position.Left}   id="lb" className="scada-handle !z-[10]" style={{ top: '85%' }} />

      {/* Node action toolbar — only in edit mode when selected */}
      {isEditMode && selected && (
        <div
          className="absolute -top-9 left-1/2 -translate-x-1/2 flex gap-1 bg-surface border border-surface-border rounded-lg px-1 py-0.5 shadow-panel nodrag nopan"
          style={{ zIndex: 20 }}
        >
          {/* Configure */}
          <button
            onClick={handleConfigure}
            className="p-1 rounded hover:bg-accent/20 text-[var(--text-secondary)] hover:text-accent transition-colors"
            title="Configure node"
          >
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <circle cx="8" cy="8" r="3" />
              <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4" strokeLinecap="round" />
            </svg>
          </button>
          {/* Duplicate */}
          <button
            onClick={handleDuplicate}
            className="p-1 rounded hover:bg-accent/20 text-[var(--text-secondary)] hover:text-accent transition-colors"
            title="Duplikat"
          >
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <rect x="2" y="4" width="8" height="8" rx="1" />
              <path d="M6 4V2.5A.5.5 0 016.5 2H13.5a.5.5 0 01.5.5V9.5a.5.5 0 01-.5.5H12" />
            </svg>
          </button>
          {/* Delete */}
          <button
            onClick={handleDelete}
            className="p-1 rounded hover:bg-red-500/20 text-[var(--text-secondary)] hover:text-status-alert transition-colors"
            title="Hapus (Del)"
          >
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M5 3h6M4 5h8l-.7 8a1 1 0 01-1 .9H5.7a1 1 0 01-1-.9L4 5z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}
    </>
  )
}
