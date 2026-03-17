// ============================================================
// TrendCard — Card-style trend chart with header, Y-axis & X-axis
// Rendered above/inside SCADA nodes for clear trend visualization.
// Header: "📈 TRENDS (6H)"   Body: area chart with axes
// ============================================================

import React, { useMemo } from 'react'
import type { SparklinePoint } from './Sparkline'

export interface TrendCardProps {
  /** Data points sorted by time ascending */
  data: SparklinePoint[]
  /** Time window in hours (for header label) */
  hours?: number
  /** Chart accent color */
  color?: string
  /** Card width */
  width?: number
  /** Card height (including header) */
  height?: number
  /** Optional label override in header */
  label?: string
  /** Hide header */
  hideHeader?: boolean
  /** Transparent mode — no bg/border (for embedding inside another card) */
  transparent?: boolean
  /** Compact font sizes for embedded use */
  compact?: boolean
  /** Optional className */
  className?: string
}

// ── Helpers ─────────────────────────────────────────────────

function formatTime(ts: string | number): string {
  const d = typeof ts === 'string' ? new Date(ts) : new Date(ts)
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

function niceStep(range: number, targetTicks: number): number {
  const rough = range / targetTicks
  const pow = Math.pow(10, Math.floor(Math.log10(rough)))
  const frac = rough / pow
  let nice: number
  if (frac <= 1.5) nice = 1
  else if (frac <= 3) nice = 2
  else if (frac <= 7) nice = 5
  else nice = 10
  return nice * pow
}

function generateYTicks(min: number, max: number, targetTicks = 4): number[] {
  const range = max - min || 1
  const step = niceStep(range, targetTicks)
  const start = Math.floor(min / step) * step
  const ticks: number[] = []
  for (let v = start; v <= max + step * 0.01; v += step) {
    ticks.push(parseFloat(v.toFixed(6)))
  }
  // Ensure at least 2 ticks
  if (ticks.length < 2) {
    ticks.unshift(ticks[0] - step)
  }
  return ticks
}

function generateTimeTicks(data: SparklinePoint[], targetTicks = 4): { ts: number; label: string }[] {
  if (data.length < 2) return []
  const t0 = new Date(data[0].ts).getTime()
  const t1 = new Date(data[data.length - 1].ts).getTime()
  const span = t1 - t0
  if (span <= 0) return []

  const ticks: { ts: number; label: string }[] = []
  const step = span / (targetTicks + 1)
  for (let i = 1; i <= targetTicks; i++) {
    const t = t0 + step * i
    ticks.push({ ts: t, label: formatTime(t) })
  }
  return ticks
}

// ── Component ───────────────────────────────────────────────

export function TrendCard({
  data,
  hours = 1,
  color = '#22d3ee',
  width = 200,
  height = 120,
  label,
  hideHeader = false,
  transparent = false,
  compact = false,
  className,
}: TrendCardProps) {
  const headerH = hideHeader ? 0 : 22
  const yAxisW = compact ? 24 : 30
  const xAxisH = compact ? 13 : 16
  const padR = compact ? 4 : 6
  const padT = compact ? 8 : 10
  const yFontSize = compact ? 7 : 8
  const xFontSize = compact ? 7 : 8

  // Chart area dimensions
  const chartW = width - yAxisW - padR
  const chartH = height - headerH - xAxisH - padT

  const { polyline, fillPath, lastPt, yTicks, timeTicks, yMin, yMax } = useMemo(() => {
    if (!data || data.length < 2) {
      return { polyline: '', fillPath: '', lastPt: null, yTicks: [], timeTicks: [], yMin: 0, yMax: 1 }
    }

    const values = data.map((d) => d.value)
    const rawMin = Math.min(...values)
    const rawMax = Math.max(...values)

    // Generate nice Y ticks
    const ticks = generateYTicks(rawMin, rawMax, 4)
    const domainMin = ticks[0]
    const domainMax = ticks[ticks.length - 1]
    const vRange = domainMax - domainMin || 1

    // Time domain
    const t0 = new Date(data[0].ts).getTime()
    const t1 = new Date(data[data.length - 1].ts).getTime()
    const tRange = t1 - t0 || 1

    // Map to pixel coordinates
    const pts = data.map((d) => {
      const tMs = new Date(d.ts).getTime()
      const x = ((tMs - t0) / tRange) * chartW
      const y = padT + chartH - ((d.value - domainMin) / vRange) * chartH
      return { x, y }
    })

    const polylineStr = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

    const fillStr = pts.length > 0
      ? `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)} `
        + pts.slice(1).map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
        + ` L${pts[pts.length - 1].x.toFixed(1)},${padT + chartH} L${pts[0].x.toFixed(1)},${padT + chartH} Z`
      : ''

    // Time ticks (4 evenly spaced)
    const tt = generateTimeTicks(data, 4).map((tick) => ({
      ...tick,
      x: ((tick.ts - t0) / tRange) * chartW,
    }))

    return {
      polyline: polylineStr,
      fillPath: fillStr,
      lastPt: pts[pts.length - 1] ?? null,
      yTicks: ticks.map((v) => ({
        value: v,
        y: padT + chartH - ((v - domainMin) / vRange) * chartH,
        label: v % 1 === 0 ? v.toFixed(0) : v.toFixed(1),
      })),
      timeTicks: tt,
      yMin: domainMin,
      yMax: domainMax,
    }
  }, [data, chartW, chartH, padT])

  const headerLabel = label ?? `TRENDS (${hours}H)`

  // Not enough data
  if (!data || data.length < 2) {
    return (
      <div
        className={[transparent ? '' : 'rounded-lg', 'overflow-hidden', className].filter(Boolean).join(' ')}
        style={{
          width,
          height,
          ...(transparent ? {} : {
            backgroundColor: 'rgba(15,23,42,0.85)',
            border: '1px solid rgba(51,65,85,0.5)',
          }),
        }}
      >
        {!hideHeader && (
          <div
            className="flex items-center gap-1.5 px-2 font-bold tracking-wider"
            style={{
              height: headerH,
              fontSize: 9,
              color: 'var(--text-muted)',
              borderBottom: '1px solid rgba(51,65,85,0.3)',
            }}
          >
            <span style={{ fontSize: 11 }}>📈</span>
            <span>{headerLabel}</span>
          </div>
        )}
        <div className="flex items-center justify-center h-full">
          <span className="text-[9px] text-[var(--text-muted)] opacity-50 italic">No trend data</span>
        </div>
      </div>
    )
  }

  const gradientId = `trend-card-grad-${color.replace(/[^a-z0-9]/gi, '')}`

  return (
    <div
      className={[transparent ? '' : 'rounded-lg', 'overflow-hidden', className].filter(Boolean).join(' ')}
      style={{
        width,
        height,
        ...(transparent ? {} : {
          backgroundColor: 'rgba(15,23,42,0.85)',
          border: '1px solid rgba(51,65,85,0.5)',
        }),
      }}
    >
      {/* ── Header ── */}
      {!hideHeader && (
        <div
          className="flex items-center gap-1.5 px-2 font-bold tracking-wider"
          style={{
            height: headerH,
            fontSize: 9,
            color: 'var(--text-secondary)',
            borderBottom: '1px solid rgba(51,65,85,0.3)',
          }}
        >
          <span style={{ fontSize: 11 }}>📈</span>
          <span>{headerLabel}</span>
        </div>
      )}

      {/* ── Chart body ── */}
      <div className="relative" style={{ height: height - headerH }}>
        {/* Y-axis labels */}
        <div
          className="absolute top-0 left-0 flex flex-col justify-between"
          style={{ width: yAxisW, height: chartH + padT, paddingTop: padT }}
        >
          {[...yTicks].reverse().map((tick, i) => (
            <span
              key={i}
              className="text-right pr-1 leading-none"
              style={{
                fontSize: yFontSize,
                color: 'var(--text-muted)',
                position: 'absolute',
                right: 2,
                top: tick.y - 4,
              }}
            >
              {tick.label}
            </span>
          ))}
        </div>

        {/* SVG chart area */}
        <svg
          width={chartW}
          height={chartH + padT}
          viewBox={`0 0 ${chartW} ${chartH + padT}`}
          preserveAspectRatio="none"
          style={{
            position: 'absolute',
            left: yAxisW,
            top: 0,
            display: 'block',
          }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>

          {/* Y-axis grid lines */}
          {yTicks.map((tick, i) => (
            <line
              key={i}
              x1={0} y1={tick.y}
              x2={chartW} y2={tick.y}
              stroke="rgba(148,163,184,0.12)"
              strokeWidth={0.5}
              strokeDasharray="3,3"
            />
          ))}

          {/* Fill area */}
          {fillPath && (
            <path d={fillPath} fill={`url(#${gradientId})`} />
          )}

          {/* Trend line */}
          <polyline
            points={polyline}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Latest point dot */}
          {lastPt && (
            <circle
              cx={lastPt.x}
              cy={lastPt.y}
              r={2.5}
              fill={color}
              opacity={0.9}
            />
          )}
        </svg>

        {/* X-axis time labels */}
        <div
          className="absolute flex justify-between"
          style={{
            left: yAxisW,
            bottom: 0,
            width: chartW,
            height: xAxisH,
          }}
        >
          {timeTicks.map((tick, i) => (
            <span
              key={i}
              className="leading-none"
              style={{
                fontSize: xFontSize,
                color: 'var(--text-muted)',
                position: 'absolute',
                left: tick.x - 12,
                bottom: 2,
              }}
            >
              {tick.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
