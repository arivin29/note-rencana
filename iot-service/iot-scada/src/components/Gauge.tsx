// ============================================================
// Gauge — Radial 270° gauge for instantaneous sensor values
// Shows current value vs [min,max] range with a status-colored arc.
// Ideal for pressure / chlorine / pH / level — "am I in the safe band?"
// ============================================================

import React from 'react'

export interface GaugeProps {
  value: number | null | undefined
  min?: number
  /** Upper scale bound. If omitted, a stable "nice" ceiling is derived from value. */
  max?: number
  unit?: string
  precision?: number
  /** Arc color (usually driven by runtime status) */
  color?: string
  /** Optional label under the value */
  label?: string
  width?: number
  height?: number
  /** Hide the numeric min/max end labels */
  hideRange?: boolean
}

// SVG geometry — 270° gauge, open at the bottom
const START_ANGLE = 135          // bottom-left
const SWEEP = 270                // clockwise over the top
const CX = 50
const CY = 44
const R = 33
const STROKE = 8

function polar(cx: number, cy: number, r: number, deg: number) {
  const a = (deg * Math.PI) / 180
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}

function arcPath(fromDeg: number, toDeg: number, r: number): string {
  const start = polar(CX, CY, r, fromDeg)
  const end = polar(CX, CY, r, toDeg)
  const largeArc = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`
}

// Smallest "nice" number >= value*1.15 — stable scale that doesn't jump on small changes
function niceCeil(v: number): number {
  if (!Number.isFinite(v) || v <= 0) return 1
  const target = v * 1.15
  const pow = Math.pow(10, Math.floor(Math.log10(target)))
  for (const m of [1, 2, 2.5, 5]) {
    if (pow * m >= target) return pow * m
  }
  return pow * 10
}

export function Gauge({
  value,
  min = 0,
  max,
  unit = '',
  precision = 1,
  color = '#38bdf8',
  label,
  width = 120,
  height = 84,
  hideRange = false,
}: GaugeProps) {
  const hasValue = typeof value === 'number' && Number.isFinite(value)
  // Derive a sensible upper bound when none is configured
  const resolvedMax = (max != null && max > min) ? max : (hasValue ? Math.max(niceCeil(value!), min + 1) : min + 1)
  const frac = hasValue ? Math.max(0, Math.min(1, (value! - min) / (resolvedMax - min))) : 0
  const valueAngle = START_ANGLE + SWEEP * frac

  const trackPath = arcPath(START_ANGLE, START_ANGLE + SWEEP, R)
  const valuePath = arcPath(START_ANGLE, valueAngle, R)
  const tip = polar(CX, CY, R, valueAngle)
  const display = hasValue ? value!.toFixed(precision) : '—'

  const startPt = polar(CX, CY, R, START_ANGLE)
  const endPt = polar(CX, CY, R, START_ANGLE + SWEEP)

  return (
    <div className="flex flex-col items-center justify-center w-full h-full" style={{ width, height }}>
      <svg viewBox="0 0 100 72" className="w-full" style={{ height: height - (label ? 12 : 0) }} preserveAspectRatio="xMidYMid meet">
        {/* Track */}
        <path d={trackPath} fill="none" stroke="rgba(148,163,184,0.28)" strokeWidth={STROKE} strokeLinecap="round" />
        {/* Value arc (always show a small cap so the gauge never looks empty) */}
        {hasValue && (
          <path d={valuePath} fill="none" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
        )}
        {/* Value tip dot */}
        {hasValue && frac > 0.02 && (
          <circle cx={tip.x} cy={tip.y} r={3.5} fill={color} stroke="rgba(15,23,42,0.9)" strokeWidth={1.3} />
        )}
        {/* Center value */}
        <text x={CX} y={CY + 1} textAnchor="middle" fontSize={18} fontWeight={700} fill="var(--text-primary)" className="tabular-nums">
          {display}
        </text>
        {unit && (
          <text x={CX} y={CY + 12} textAnchor="middle" fontSize={8.5} fill="var(--text-muted)">
            {unit}
          </text>
        )}
        {/* Range end labels */}
        {!hideRange && (
          <>
            <text x={startPt.x} y={startPt.y + 7} textAnchor="middle" fontSize={6.5} fill="var(--text-muted)" className="tabular-nums">
              {min}
            </text>
            <text x={endPt.x} y={endPt.y + 7} textAnchor="middle" fontSize={6.5} fill="var(--text-muted)" className="tabular-nums">
              {Number.isInteger(resolvedMax) ? resolvedMax : resolvedMax.toFixed(1)}
            </text>
          </>
        )}
      </svg>
      {label && (
        <div className="text-[9px] text-[var(--text-secondary)] font-medium leading-none -mt-1 truncate max-w-full">
          {label}
        </div>
      )}
    </div>
  )
}
