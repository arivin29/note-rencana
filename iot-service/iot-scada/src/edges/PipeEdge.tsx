// ============================================================
// PipeEdge — SCADA-style thick pipe with 3D effect & flow animation
//
// Visual layers (bottom-to-top):
//   1. Hit area (invisible, wide for easy clicking)
//   2. Selection glow (when selected)
//   3. Pipe wall (outer stroke, darker — gives 3D depth)
//   4. Pipe body (inner stroke, colored — the visible pipe)
//   5. Flow animation (bright dashes moving along the pipe)
//   6. Center highlight (subtle white shine)
//   7. Label (small, subtle, only when set)
// ============================================================

import React from 'react'
import {
  EdgeLabelRenderer,
  type EdgeProps,
  getStraightPath,
  getBezierPath,
  getSmoothStepPath,
} from '@xyflow/react'

import type { PipeType, FlowDirection, PathMode } from '@/types/scada'
import { useDiagramStore } from '@/stores/useDiagramStore'
import { useUiStore } from '@/stores/useUiStore'

interface PipeEdgeData {
  pipeType?: PipeType
  pathMode?: PathMode
  flowDirection?: FlowDirection
  animated?: boolean
  strokeWidth?: number
  label?: string
  labelFontSize?: number
  showBorder?: boolean
  borderWidth?: number
  lineCap?: 'round' | 'square' | 'butt'
  borderRadius?: number
}

// ── Color mapping per pipe type (3-tone: fill, wall, glow) ───

export const PIPE_COLORS: Record<PipeType, { fill: string; wall: string; glow: string }> = {
  raw:        { fill: '#3b82f6', wall: '#1e3a5f', glow: '#60a5fa' },
  treated:    { fill: '#22c55e', wall: '#14532d', glow: '#4ade80' },
  waste:      { fill: '#a855f7', wall: '#3b0764', glow: '#c084fc' },
  chemical:   { fill: '#f59e0b', wall: '#78350f', glow: '#fbbf24' },
  electrical: { fill: '#ef4444', wall: '#7f1d1d', glow: '#f87171' },
  generic:    { fill: '#6b7280', wall: '#374151', glow: '#9ca3af' },
  // Signal / sensor link — muted cyan-slate, not a process medium
  signal:     { fill: '#7c93a8', wall: '#334155', glow: '#94a3b8' },
}

export const PIPE_LABELS: Record<PipeType, string> = {
  raw:        'Raw',
  treated:    'Treated',
  waste:      'Waste',
  chemical:   'Chemical',
  electrical: 'Electrical',
  generic:    'Generic',
  signal:     'Sinyal',
}

export const PATH_MODE_LABELS: Record<PathMode, string> = {
  smoothstep: 'Smooth Step',
  bezier:     'Bezier Curve',
  straight:   'Straight Line',
  step:       'Step (Orthogonal)',
}

const FLOW_ARROW: Record<FlowDirection, string> = {
  forward:       '▸',
  reverse:       '◂',
  bidirectional: '◂▸',
  none:          '',
}

// ── Path builder ──────────────────────────────────────────────

function getEdgePath(
  pathMode: PathMode,
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  sourcePosition?: any,
  targetPosition?: any,
  edgeBorderRadius?: number,
): [string, number, number] {
  switch (pathMode) {
    case 'bezier': {
      const [path, labelX, labelY] = getBezierPath({
        sourceX, sourceY, targetX, targetY,
        sourcePosition, targetPosition,
      })
      return [path, labelX, labelY]
    }
    case 'smoothstep': {
      const [path, labelX, labelY] = getSmoothStepPath({
        sourceX, sourceY, targetX, targetY,
        sourcePosition, targetPosition,
        borderRadius: edgeBorderRadius,
      })
      return [path, labelX, labelY]
    }
    case 'step': {
      const [path, labelX, labelY] = getSmoothStepPath({
        sourceX, sourceY, targetX, targetY,
        sourcePosition, targetPosition,
        borderRadius: edgeBorderRadius,
      })
      return [path, labelX, labelY]
    }
    case 'straight':
    default: {
      const [path, labelX, labelY] = getStraightPath({
        sourceX, sourceY, targetX, targetY,
      })
      return [path, labelX, labelY]
    }
  }
}

// ── Component ─────────────────────────────────────────────────

export function PipeEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<any>) {
  const d = data as PipeEdgeData | undefined
  const pipeType      = d?.pipeType ?? 'raw'
  const pathMode      = d?.pathMode ?? 'smoothstep'
  const flowDirection = d?.flowDirection ?? 'forward'
  const animated      = d?.animated ?? false
  const strokeWidth   = d?.strokeWidth ?? 4
  const label         = d?.label
  const labelFontSize = d?.labelFontSize ?? 10
  const showBorder    = d?.showBorder ?? true
  const borderWidth   = d?.borderWidth ?? 2
  const lineCap       = d?.lineCap ?? 'round'
  const borderRadius  = d?.borderRadius ?? 12

  const colors = PIPE_COLORS[pipeType] ?? PIPE_COLORS.generic
  const isSignal = pipeType === 'signal'
  // A sensor link carries data, not flow — never show a directional arrow
  const effectiveFlow: FlowDirection = isSignal ? 'none' : flowDirection
  const isEditMode = useUiStore((s) => s.mode) === 'edit'

  const [edgePath, labelX, labelY] = getEdgePath(
    pathMode,
    sourceX, sourceY,
    targetX, targetY,
    sourcePosition, targetPosition,
    borderRadius,
  )

  // Responsive widths
  const wallWidth = strokeWidth + borderWidth * 2
  const bodyWidth = strokeWidth
  const flowWidth = Math.max(2, strokeWidth - 1)
  const hitWidth  = Math.max(wallWidth + 12, 20)

  return (
    <>
      {/* L1: Hit area */}
      <path
        d={edgePath}
        stroke="transparent"
        strokeWidth={hitWidth}
        fill="none"
        style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
      />

      {/* L2: Selection glow */}
      {selected && (
        <path
          d={edgePath}
          stroke={colors.glow}
          strokeWidth={wallWidth + 8}
          fill="none"
          opacity={0.15}
          strokeLinecap={lineCap}
          strokeLinejoin="round"
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Signal / sensor link — thin dashed line + tap dot (no process-pipe layers) */}
      {isSignal && (
        <>
          <path
            d={edgePath}
            stroke={colors.fill}
            strokeWidth={Math.max(1.25, strokeWidth * 0.4)}
            fill="none"
            strokeLinecap="butt"
            strokeLinejoin="round"
            strokeDasharray="5 4"
            opacity={selected ? 0.95 : 0.7}
            style={{ pointerEvents: 'none' }}
          />
          {/* Instrument tap at the source (measurement point) */}
          <circle cx={sourceX} cy={sourceY} r={3.5} fill={colors.fill} opacity={selected ? 1 : 0.85} style={{ pointerEvents: 'none' }} />
          <circle cx={sourceX} cy={sourceY} r={5.5} fill="none" stroke={colors.fill} strokeWidth={1} opacity={0.4} style={{ pointerEvents: 'none' }} />
        </>
      )}

      {/* L3: Pipe wall (outer — darker, gives 3D depth) */}
      {!isSignal && showBorder && (
        <path
          d={edgePath}
          stroke={colors.wall}
          strokeWidth={wallWidth}
          fill="none"
          strokeLinecap={lineCap}
          strokeLinejoin="round"
          opacity={selected ? 1 : 0.9}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* L4: Pipe body (inner — main color) */}
      {!isSignal && (
        <path
          d={edgePath}
          stroke={colors.fill}
          strokeWidth={bodyWidth}
          fill="none"
          strokeLinecap={lineCap}
          strokeLinejoin="round"
          opacity={selected ? 1 : 0.85}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* L5: Flow animation — bright moving dashes */}
      {!isSignal && animated && (
        <path
          d={edgePath}
          stroke={colors.glow}
          strokeWidth={flowWidth}
          fill="none"
          strokeLinecap={lineCap}
          strokeLinejoin="round"
          strokeDasharray={`${strokeWidth * 2} ${strokeWidth * 3}`}
          opacity={0.7}
          style={{
            pointerEvents: 'none',
            animation: flowDirection === 'reverse'
              ? `pipeFlowReverse ${1.5 + strokeWidth * 0.1}s linear infinite`
              : `pipeFlow ${1.5 + strokeWidth * 0.1}s linear infinite`,
          }}
        />
      )}

      {/* L6: Center highlight (subtle shine) */}
      {!isSignal && (
        <path
          d={edgePath}
          stroke="white"
          strokeWidth={Math.max(1, bodyWidth * 0.25)}
          fill="none"
          strokeLinecap={lineCap}
          strokeLinejoin="round"
          opacity={0.08}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* L7: Label — small subtle tag at midpoint */}
      {(label || effectiveFlow !== 'none') && (
        <EdgeLabelRenderer>
          <div
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="absolute nodrag nopan"
          >
            <div
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-sm font-mono transition-opacity duration-200"
              style={{
                fontSize: labelFontSize,
                backgroundColor: colors.wall + 'cc',
                border: `1px solid ${colors.fill}44`,
                color: colors.glow,
                opacity: selected ? 1 : 0.6,
              }}
            >
              {effectiveFlow !== 'none' && (
                <span style={{ fontSize: labelFontSize - 1 }}>
                  {FLOW_ARROW[effectiveFlow]}
                </span>
              )}
              {label ? (
                <span className="opacity-90">{label}</span>
              ) : (
                <span className="opacity-70 capitalize" style={{ fontSize: Math.max(7, labelFontSize - 1) }}>
                  {PIPE_LABELS[pipeType]}
                </span>
              )}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}

      {/* L8: Edit-mode action buttons — delete + config */}
      {selected && isEditMode && (
        <EdgeLabelRenderer>
          <div
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY - 22}px)`,
              pointerEvents: 'all',
            }}
            className="absolute nodrag nopan"
          >
            <div className="flex items-center gap-1 bg-surface border border-surface-border rounded-lg px-1 py-0.5 shadow-panel">
              {/* Edit config */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  useUiStore.getState().openEdgeConfig(id)
                }}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-accent/20 text-[var(--text-muted)] hover:text-accent transition-colors"
                title="Edit pipe config"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"/>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
              </button>
              {/* Delete */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  useDiagramStore.getState().removeEdge(id)
                }}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-500/20 text-[var(--text-muted)] hover:text-red-400 transition-colors"
                title="Delete pipe"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

// Edge registry
export const edgeTypes = {
  pipe: PipeEdge,
} as const
