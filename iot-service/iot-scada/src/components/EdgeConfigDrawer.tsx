// ============================================================
// EdgeConfigDrawer — Edge/Pipe configuration drawer
// Opens via double-click on edge or programmatic trigger
// ============================================================

import React, { useEffect, useState } from 'react'
import { useUiStore } from '@/stores/useUiStore'
import { useDiagramStore } from '@/stores/useDiagramStore'
import type { PipeType, PathMode, FlowDirection } from '@/types/scada'
import {
  PIPE_COLORS,
  PIPE_LABELS,
  PATH_MODE_LABELS,
} from '@/edges/PipeEdge'

// ── Helpers ───────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 mt-1">
      {children}
    </div>
  )
}

const PIPE_TYPES: PipeType[] = ['raw', 'treated', 'waste', 'chemical', 'electrical', 'generic']
const PATH_MODES: PathMode[] = ['smoothstep', 'bezier', 'straight', 'step']
const FLOW_DIRS: { key: FlowDirection; label: string; icon: string }[] = [
  { key: 'forward', label: 'Forward', icon: '→' },
  { key: 'reverse', label: 'Reverse', icon: '←' },
  { key: 'bidirectional', label: 'Both', icon: '↔' },
  { key: 'none', label: 'None', icon: '—' },
]

// ── Handle port icon builder ──────────────────────────────────
// Draws a small 16×16 box with a colored dot indicating the handle position
function HandleDotIcon({ side, offset }: { side: 'top' | 'right' | 'bottom' | 'left'; offset: number }) {
  // offset: 0 = first (15%), 1 = center (50%), 2 = last (85%)
  const pct = offset === 0 ? 15 : offset === 1 ? 50 : 85
  let cx: number, cy: number
  switch (side) {
    case 'top':    cx = pct * 12 / 100 + 2; cy = 2; break
    case 'bottom': cx = pct * 12 / 100 + 2; cy = 14; break
    case 'left':   cx = 2; cy = pct * 12 / 100 + 2; break
    case 'right':  cx = 14; cy = pct * 12 / 100 + 2; break
  }
  return (
    <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={0.8}>
      <rect x="2" y="2" width="12" height="12" rx="2" opacity={0.3} />
      <circle cx={cx} cy={cy} r="2" fill="currentColor" stroke="none" />
    </svg>
  )
}

type HandlePortDef = { id: string; label: string; side: 'top' | 'right' | 'bottom' | 'left'; offset: number }

const HANDLE_PORTS: HandlePortDef[] = [
  // Top side (left → center → right)
  { id: 'tl', label: 'Top-L',  side: 'top',    offset: 0 },
  { id: 't',  label: 'Top',    side: 'top',    offset: 1 },
  { id: 'tr', label: 'Top-R',  side: 'top',    offset: 2 },
  // Right side (top → center → bottom)
  { id: 'rt', label: 'Right-T', side: 'right',  offset: 0 },
  { id: 'r',  label: 'Right',   side: 'right',  offset: 1 },
  { id: 'rb', label: 'Right-B', side: 'right',  offset: 2 },
  // Bottom side (left → center → right)
  { id: 'bl', label: 'Bot-L',  side: 'bottom', offset: 0 },
  { id: 'b',  label: 'Bottom', side: 'bottom', offset: 1 },
  { id: 'br', label: 'Bot-R',  side: 'bottom', offset: 2 },
  // Left side (top → center → bottom)
  { id: 'lt', label: 'Left-T', side: 'left',   offset: 0 },
  { id: 'l',  label: 'Left',   side: 'left',   offset: 1 },
  { id: 'lb', label: 'Left-B', side: 'left',   offset: 2 },
]

// Resolve a handle ID to SVG coordinates on a node box
function handleXY(handleId: string, x: number, y: number, w: number, h: number): [number, number] {
  const hp = HANDLE_PORTS.find((p) => p.id === handleId)
  if (!hp) return [x + w / 2, y] // fallback to top center
  const pct = hp.offset === 0 ? 0.15 : hp.offset === 1 ? 0.5 : 0.85
  switch (hp.side) {
    case 'top':    return [x + w * pct, y]
    case 'bottom': return [x + w * pct, y + h]
    case 'left':   return [x, y + h * pct]
    case 'right':  return [x + w, y + h * pct]
  }
}

// ══════════════════════════════════════════════════════════════
// MAIN DRAWER
// ══════════════════════════════════════════════════════════════

export function EdgeConfigDrawer() {
  const edgeId = useUiStore((s) => s.configDrawerEdgeId)
  const close = useUiStore((s) => s.closeEdgeConfig)
  const edge = useDiagramStore((s) =>
    edgeId ? s.edges.find((e) => e.id === edgeId) : null
  )
  const updateEdge = useDiagramStore((s) => s.updateEdge)
  const nodes = useDiagramStore((s) => s.nodes)

  // Resolve source/target node labels
  const sourceNode = nodes.find((n) => n.id === edge?.source)
  const targetNode = nodes.find((n) => n.id === edge?.target)

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && edgeId) {
        e.stopPropagation()
        close()
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [edgeId, close])

  if (!edgeId || !edge) return null

  const pipeType      = edge.pipeType ?? 'raw'
  const pathMode      = edge.pathMode ?? 'smoothstep'
  const flowDirection = edge.flowDirection ?? 'forward'
  const strokeWidth   = edge.strokeWidth ?? 2
  const labelFontSize = edge.labelFontSize ?? 10
  const srcHandle     = edge.sourceHandle ?? 'b'
  const tgtHandle     = edge.targetHandle ?? 't'
  const showBorder    = edge.showBorder ?? true
  const borderWidthVal = edge.borderWidth ?? 2
  const lineCap       = edge.lineCap ?? 'round'
  const borderRadiusVal = edge.borderRadius ?? 12

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={close}
      />

      {/* Drawer panel */}
      <div className="fixed right-0 top-0 bottom-0 w-[360px] max-w-[90vw] bg-surface border-l border-surface-border z-50 flex flex-col shadow-2xl panel-slide-in">
        {/* Header */}
        <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: PIPE_COLORS[pipeType].fill + '20', color: PIPE_COLORS[pipeType].fill }}>
              <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M2 8h12M10 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[var(--text-primary)] truncate">
                {edge.label || 'Edge Configuration'}
              </div>
              <div className="text-[10px] text-[var(--text-muted)]">
                {PIPE_LABELS[pipeType]} • {PATH_MODE_LABELS[pathMode]}
              </div>
            </div>
          </div>
          <button
            onClick={close}
            className="p-1.5 rounded-lg hover:bg-surface border border-transparent hover:border-surface-border text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 scada-scrollbar">
          {/* Label */}
          <div>
            <label className="scada-label">Label</label>
            <input
              className="scada-input"
              value={edge.label ?? ''}
              onChange={(e) => updateEdge(edgeId, { label: e.target.value || null })}
              placeholder="Edge label (optional)"
            />
          </div>

          {/* Connection Ports */}
          <div>
            <SectionTitle>Connection Ports</SectionTitle>
            <div className="space-y-3">
              {/* Source Port */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                  <span className="text-[10px] text-[var(--text-secondary)]">
                    Source: <span className="text-[var(--text-primary)] font-medium">{sourceNode?.label ?? '?'}</span>
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {HANDLE_PORTS.map((hp) => (
                    <button
                      key={hp.id}
                      onClick={() => updateEdge(edgeId, { sourceHandle: hp.id })}
                      className={[
                        'flex items-center gap-1 px-1.5 py-1 rounded-lg border text-[9px] transition-all',
                        srcHandle === hp.id
                          ? 'border-accent/50 bg-accent/10 text-accent'
                          : 'border-surface-border hover:border-accent/20 text-[var(--text-muted)]',
                      ].join(' ')}
                      title={hp.label}
                    >
                      <HandleDotIcon side={hp.side} offset={hp.offset} />
                      <span className="truncate">{hp.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Port */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-2 h-2 rounded-full bg-status-warn flex-shrink-0" />
                  <span className="text-[10px] text-[var(--text-secondary)]">
                    Target: <span className="text-[var(--text-primary)] font-medium">{targetNode?.label ?? '?'}</span>
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {HANDLE_PORTS.map((hp) => (
                    <button
                      key={hp.id}
                      onClick={() => updateEdge(edgeId, { targetHandle: hp.id })}
                      className={[
                        'flex items-center gap-1 px-1.5 py-1 rounded-lg border text-[9px] transition-all',
                        tgtHandle === hp.id
                          ? 'border-status-warn/50 bg-status-warn/10 text-status-warn'
                          : 'border-surface-border hover:border-status-warn/20 text-[var(--text-muted)]',
                      ].join(' ')}
                      title={hp.label}
                    >
                      <HandleDotIcon side={hp.side} offset={hp.offset} />
                      <span className="truncate">{hp.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Visual hint */}
              <div className="bg-canvas rounded-lg border border-surface-border p-3">
                <svg viewBox="0 0 200 80" className="w-full h-16">
                  {/* Source node */}
                  <rect x="10" y="20" width="50" height="40" rx="6" fill="var(--color-accent)" opacity={0.15} stroke="var(--color-accent)" strokeWidth={1} />
                  <text x="35" y="44" textAnchor="middle" fill="var(--color-accent)" style={{ fontSize: 8 }}>SRC</text>
                  {/* Source handle dot */}
                  {(() => { const [sx, sy] = handleXY(srcHandle, 10, 20, 50, 40); return <circle cx={sx} cy={sy} r="3" fill="var(--color-accent)" /> })()}
                  {/* Target node */}
                  <rect x="140" y="20" width="50" height="40" rx="6" fill="var(--color-status-warn)" opacity={0.15} stroke="var(--color-status-warn)" strokeWidth={1} />
                  <text x="165" y="44" textAnchor="middle" fill="var(--color-status-warn)" style={{ fontSize: 8 }}>TGT</text>
                  {/* Target handle dot */}
                  {(() => { const [tx, ty] = handleXY(tgtHandle, 140, 20, 50, 40); return <circle cx={tx} cy={ty} r="3" fill="var(--color-status-warn)" /> })()}
                  {/* Connecting line */}
                  {(() => {
                    const [sx, sy] = handleXY(srcHandle, 10, 20, 50, 40)
                    const [tx, ty] = handleXY(tgtHandle, 140, 20, 50, 40)
                    return (
                      <line
                        x1={sx} y1={sy} x2={tx} y2={ty}
                        stroke={PIPE_COLORS[pipeType].fill}
                        strokeWidth={Math.max(1, strokeWidth * 0.6)}
                        strokeDasharray="4 2"
                        opacity={0.6}
                      />
                    )
                  })()}
                </svg>
              </div>
            </div>
          </div>

          {/* Pipe Type */}
          <div>
            <SectionTitle>Pipe Type</SectionTitle>
            <div className="grid grid-cols-3 gap-1.5">
              {PIPE_TYPES.map((pt) => (
                <button
                  key={pt}
                  onClick={() => updateEdge(edgeId, { pipeType: pt })}
                  className={[
                    'flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[10px] transition-all',
                    pipeType === pt
                      ? 'border-accent/50 bg-accent/10 text-accent'
                      : 'border-surface-border hover:border-accent/20 text-[var(--text-secondary)]',
                  ].join(' ')}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: PIPE_COLORS[pt].fill }}
                  />
                  <span className="capitalize truncate">{pt}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Path Mode */}
          <div>
            <SectionTitle>Path Mode</SectionTitle>
            <div className="grid grid-cols-2 gap-1.5">
              {PATH_MODES.map((pm) => (
                <button
                  key={pm}
                  onClick={() => updateEdge(edgeId, { pathMode: pm })}
                  className={[
                    'text-[10px] py-1.5 px-2 rounded-lg border transition-colors',
                    pathMode === pm
                      ? 'bg-accent/10 border-accent/40 text-accent'
                      : 'bg-canvas border-surface-border text-[var(--text-muted)] hover:border-accent/20',
                  ].join(' ')}
                >
                  {PATH_MODE_LABELS[pm]}
                </button>
              ))}
            </div>
          </div>

          {/* Flow Direction */}
          <div>
            <SectionTitle>Flow Direction</SectionTitle>
            <div className="flex gap-1.5">
              {FLOW_DIRS.map((fd) => (
                <button
                  key={fd.key}
                  onClick={() => updateEdge(edgeId, { flowDirection: fd.key })}
                  className={[
                    'flex-1 text-[10px] py-1.5 rounded-lg border transition-colors flex flex-col items-center gap-0.5',
                    flowDirection === fd.key
                      ? 'bg-accent/10 border-accent/40 text-accent'
                      : 'bg-canvas border-surface-border text-[var(--text-muted)] hover:border-accent/20',
                  ].join(' ')}
                >
                  <span className="text-base leading-none">{fd.icon}</span>
                  <span>{fd.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Stroke Width */}
          <div>
            <SectionTitle>Stroke Width</SectionTitle>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={1}
                max={10}
                step={0.5}
                value={strokeWidth}
                onChange={(e) => updateEdge(edgeId, { strokeWidth: Number(e.target.value) })}
                className="flex-1 accent-accent h-1 bg-canvas rounded"
              />
              <span className="text-xs text-[var(--text-secondary)] font-mono w-10 text-right">
                {strokeWidth}px
              </span>
            </div>
          </div>

          {/* Border (Pipe Wall) */}
          <div>
            <SectionTitle>Border (Pipe Wall)</SectionTitle>
            <div className="space-y-3">
              {/* Toggle */}
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-[var(--text-secondary)]">Show Border</label>
                <button
                  onClick={() => updateEdge(edgeId, { showBorder: !showBorder })}
                  className={[
                    'w-9 h-5 rounded-full transition-colors relative',
                    showBorder ? 'bg-accent' : 'bg-gray-600',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform',
                      showBorder ? 'left-[18px]' : 'left-0.5',
                    ].join(' ')}
                  />
                </button>
              </div>

              {/* Border Width — only when border is shown */}
              {showBorder && (
                <div>
                  <label className="text-[10px] text-[var(--text-muted)] mb-1 block">Border Width</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={1}
                      max={6}
                      step={0.5}
                      value={borderWidthVal}
                      onChange={(e) => updateEdge(edgeId, { borderWidth: Number(e.target.value) })}
                      className="flex-1 accent-accent h-1 bg-canvas rounded"
                    />
                    <span className="text-xs text-[var(--text-secondary)] font-mono w-10 text-right">
                      {borderWidthVal}px
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Line Cap */}
          <div>
            <SectionTitle>Line Endpoints</SectionTitle>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                { id: 'round' as const, label: 'Round', desc: 'Rounded ends' },
                { id: 'square' as const, label: 'Square', desc: 'Square ends' },
                { id: 'butt' as const, label: 'Flat', desc: 'No extension' },
              ]).map((lc) => (
                <button
                  key={lc.id}
                  onClick={() => updateEdge(edgeId, { lineCap: lc.id })}
                  className={[
                    'flex flex-col items-center gap-1 py-2 rounded-lg border text-[10px] transition-all',
                    lineCap === lc.id
                      ? 'bg-accent/10 border-accent/40 text-accent'
                      : 'bg-canvas border-surface-border text-[var(--text-muted)] hover:border-accent/20',
                  ].join(' ')}
                  title={lc.desc}
                >
                  <svg viewBox="0 0 32 12" className="w-8 h-3">
                    <line x1="4" y1="6" x2="28" y2="6"
                      stroke="currentColor" strokeWidth={4}
                      strokeLinecap={lc.id}
                    />
                  </svg>
                  <span>{lc.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Corner Radius */}
          <div>
            <SectionTitle>Corner Radius</SectionTitle>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={30}
                step={1}
                value={borderRadiusVal}
                onChange={(e) => updateEdge(edgeId, { borderRadius: Number(e.target.value) })}
                className="flex-1 accent-accent h-1 bg-canvas rounded"
              />
              <span className="text-xs text-[var(--text-secondary)] font-mono w-10 text-right">
                {borderRadiusVal}px
              </span>
            </div>
            <p className="text-[9px] text-[var(--text-muted)] mt-1">Only affects Smooth Step &amp; Step modes</p>
          </div>

          {/* Label Font Size */}
          <div>
            <SectionTitle>Label Font Size</SectionTitle>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={6}
                max={24}
                value={labelFontSize}
                onChange={(e) => updateEdge(edgeId, { labelFontSize: Number(e.target.value) })}
                className="flex-1 accent-accent h-1 bg-canvas rounded"
              />
              <span className="text-xs text-[var(--text-secondary)] font-mono w-10 text-right">
                {labelFontSize}px
              </span>
            </div>
          </div>

          {/* Animation */}
          <div>
            <SectionTitle>Animation</SectionTitle>
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-[var(--text-secondary)]">Flow Animation</label>
              <button
                onClick={() => updateEdge(edgeId, { animated: !(edge.animated ?? false) })}
                className={[
                  'w-9 h-5 rounded-full transition-colors relative',
                  (edge.animated ?? false) ? 'bg-accent' : 'bg-gray-600',
                ].join(' ')}
              >
                <span
                  className={[
                    'absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform',
                    (edge.animated ?? false) ? 'left-[18px]' : 'left-0.5',
                  ].join(' ')}
                />
              </button>
            </div>
          </div>

          {/* Preview */}
          <div>
            <SectionTitle>Preview</SectionTitle>
            <div className="bg-canvas rounded-xl border border-surface-border p-4">
              <svg viewBox="0 0 200 60" className="w-full h-12">
                {/* Border (wall) layer */}
                {showBorder && (
                  <path
                    d={pathMode === 'straight'
                      ? 'M 20 30 L 180 30'
                      : pathMode === 'bezier'
                        ? 'M 20 30 C 80 10, 120 50, 180 30'
                        : 'M 20 30 L 60 30 L 60 30 L 100 30 L 100 30 L 140 30 L 140 30 L 180 30'}
                    fill="none"
                    stroke={PIPE_COLORS[pipeType].wall}
                    strokeWidth={strokeWidth + borderWidthVal * 2}
                    strokeLinecap={lineCap}
                    opacity={0.9}
                  />
                )}
                {/* Body layer */}
                <path
                  d={pathMode === 'straight'
                    ? 'M 20 30 L 180 30'
                    : pathMode === 'bezier'
                      ? 'M 20 30 C 80 10, 120 50, 180 30'
                      : 'M 20 30 L 60 30 L 60 30 L 100 30 L 100 30 L 140 30 L 140 30 L 180 30'}
                  fill="none"
                  stroke={PIPE_COLORS[pipeType].fill}
                  strokeWidth={strokeWidth}
                  strokeLinecap={lineCap}
                  strokeDasharray={edge.animated ? '8 4' : undefined}
                  opacity={0.8}
                />
                {/* Direction arrows */}
                {(flowDirection === 'forward' || flowDirection === 'bidirectional') && (
                  <path d="M174 25l6 5-6 5" fill="none" stroke={PIPE_COLORS[pipeType].fill} strokeWidth={1.5} strokeLinecap="round" />
                )}
                {(flowDirection === 'reverse' || flowDirection === 'bidirectional') && (
                  <path d="M26 25l-6 5 6 5" fill="none" stroke={PIPE_COLORS[pipeType].fill} strokeWidth={1.5} strokeLinecap="round" />
                )}
                {/* Label sample */}
                <text
                  x="100"
                  y={50}
                  textAnchor="middle"
                  fill="currentColor"
                  className="text-[var(--text-muted)]"
                  style={{ fontSize: labelFontSize }}
                >
                  {edge.label || pipeType}
                </text>
              </svg>
            </div>
          </div>

          {/* IDs */}
          <div>
            <SectionTitle>Info</SectionTitle>
            <div className="space-y-1 text-[9px] font-mono text-[var(--text-muted)]">
              <div className="bg-canvas rounded px-2 py-1 border border-surface-border">Edge: {edgeId.slice(0, 12)}…</div>
              <div className="bg-canvas rounded px-2 py-1 border border-surface-border">Source: {edge.source.slice(0, 12)}…</div>
              <div className="bg-canvas rounded px-2 py-1 border border-surface-border">Target: {edge.target.slice(0, 12)}…</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-surface-border flex-shrink-0">
          <button onClick={close} className="btn-primary w-full h-8 text-xs">
            Done
          </button>
        </div>
      </div>
    </>
  )
}
