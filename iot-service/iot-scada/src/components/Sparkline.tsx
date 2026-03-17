// ============================================================
// Sparkline — Lightweight inline trend chart (pure SVG)
// No external deps. Renders a polyline + optional gradient fill.
// Used inside SCADA nodes for mini sensor history visualization.
// ============================================================

import React, { useMemo } from 'react'

export interface SparklinePoint {
  ts: string | number   // timestamp (ISO or epoch ms)
  value: number
}

export interface SparklineProps {
  /** Data points sorted by time ascending */
  data: SparklinePoint[]
  /** SVG width in px */
  width?: number
  /** SVG height in px */
  height?: number
  /** Line stroke color */
  color?: string
  /** Line stroke width */
  strokeWidth?: number
  /** Show gradient fill below line */
  fill?: boolean
  /** Fill opacity (0-1) */
  fillOpacity?: number
  /** Show min/max horizontal reference lines */
  showRange?: boolean
  /** Show a dot on the latest point */
  showDot?: boolean
  /** Optional className on root SVG */
  className?: string
}

/**
 * Pure SVG sparkline — no axis, no labels.
 * Auto-scales to data range with 5% vertical padding.
 */
export function Sparkline({
  data,
  width = 80,
  height = 24,
  color = '#22d3ee',
  strokeWidth = 1.5,
  fill = true,
  fillOpacity = 0.15,
  showRange = false,
  showDot = true,
  className,
}: SparklineProps) {
  const { polyline, fillPath, lastPt, minY, maxY } = useMemo(() => {
    if (!data || data.length < 2) {
      return { polyline: '', fillPath: '', lastPt: null, minY: 0, maxY: 0 }
    }

    const values = data.map((d) => d.value)
    const rawMin = Math.min(...values)
    const rawMax = Math.max(...values)

    // Add 5% padding so line doesn't touch edges
    const range = rawMax - rawMin || 1
    const padV = range * 0.05
    const minV = rawMin - padV
    const maxV = rawMax + padV
    const vRange = maxV - minV

    const pad = 1 // horizontal padding
    const drawW = width - pad * 2
    const drawH = height - 2
    const count = data.length

    const pts = data.map((d, i) => {
      const x = pad + (i / (count - 1)) * drawW
      const y = 1 + drawH - ((d.value - minV) / vRange) * drawH
      return { x, y }
    })

    const polylineStr = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

    // Closed fill path: line + bottom edge
    const fillStr = pts.length > 0
      ? `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)} `
        + pts.slice(1).map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
        + ` L${pts[pts.length - 1].x.toFixed(1)},${height - 1} L${pts[0].x.toFixed(1)},${height - 1} Z`
      : ''

    // Range line Y positions
    const minLineY = 1 + drawH - ((rawMin - minV) / vRange) * drawH
    const maxLineY = 1 + drawH - ((rawMax - minV) / vRange) * drawH

    return {
      polyline: polylineStr,
      fillPath: fillStr,
      lastPt: pts[pts.length - 1] ?? null,
      minY: minLineY,
      maxY: maxLineY,
    }
  }, [data, width, height])

  if (!data || data.length < 2) {
    // Not enough data — show a subtle placeholder
    return (
      <svg
        width={width}
        height={height}
        className={className}
        viewBox={`0 0 ${width} ${height}`}
      >
        <line
          x1={1} y1={height / 2}
          x2={width - 1} y2={height / 2}
          stroke={color}
          strokeWidth={0.5}
          strokeDasharray="2,3"
          opacity={0.3}
        />
      </svg>
    )
  }

  const gradientId = `sparkline-grad-${color.replace(/[^a-z0-9]/gi, '')}`

  return (
    <svg
      width={width}
      height={height}
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ display: 'block' }}
    >
      {/* Gradient definition */}
      {fill && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={fillOpacity} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
      )}

      {/* Range reference lines */}
      {showRange && (
        <>
          <line
            x1={1} y1={minY} x2={width - 1} y2={minY}
            stroke={color} strokeWidth={0.3} strokeDasharray="2,2" opacity={0.4}
          />
          <line
            x1={1} y1={maxY} x2={width - 1} y2={maxY}
            stroke={color} strokeWidth={0.3} strokeDasharray="2,2" opacity={0.4}
          />
        </>
      )}

      {/* Fill area */}
      {fill && fillPath && (
        <path d={fillPath} fill={`url(#${gradientId})`} />
      )}

      {/* Trend line */}
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Latest point dot */}
      {showDot && lastPt && (
        <circle
          cx={lastPt.x}
          cy={lastPt.y}
          r={2}
          fill={color}
          opacity={0.9}
        />
      )}
    </svg>
  )
}
