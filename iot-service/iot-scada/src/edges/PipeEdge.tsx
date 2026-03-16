// ============================================================
// PipeEdge — Custom edge untuk koneksi pipa SCADA
// Warna berbeda untuk raw (biru) dan treated (hijau)
// Animasi aliran saat animated=true
// ============================================================

import React from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  getStraightPath,
} from '@xyflow/react'

type PipeType = 'raw' | 'treated'
type FlowDirection = 'forward' | 'reverse' | 'bidirectional'

interface PipeEdgeData {
  pipeType?: PipeType
  flowDirection?: FlowDirection
  animated?: boolean
  label?: string
}

const PIPE_COLOR: Record<string, string> = {
  raw:      '#3b82f6', // blue-500
  treated:  '#22c55e', // green-500
  default:  '#6b7280', // gray-500
}

const FLOW_ARROW: Record<FlowDirection, string> = {
  forward:       '→',
  reverse:       '←',
  bidirectional: '↔',
}

export function PipeEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  selected,
  markerEnd,
}: EdgeProps<PipeEdgeData>) {
  const pipeType      = data?.pipeType ?? 'raw'
  const flowDirection = data?.flowDirection ?? 'forward'
  const animated      = data?.animated ?? false
  const label         = data?.label

  const color   = PIPE_COLOR[pipeType] ?? PIPE_COLOR.default
  const opacity = selected ? 1 : 0.8

  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  })

  return (
    <>
      {/* Glow layer (selected or alert) */}
      {selected && (
        <path
          d={edgePath}
          stroke={color}
          strokeWidth={8}
          fill="none"
          opacity={0.15}
          style={{ pointerEvents: 'none' }}
        />
      )}

      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: color,
          strokeWidth: selected ? 3 : 2,
          opacity,
          strokeDasharray: animated ? '8 4' : undefined,
          animation: animated ? 'pipeFlow 1.2s linear infinite' : undefined,
        }}
      />

      {/* Direction + label */}
      <EdgeLabelRenderer>
        <div
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="absolute nodrag nopan"
        >
          <div className={[
            'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono',
            'bg-canvas border border-surface-border',
            'transition-opacity duration-150',
            selected ? 'opacity-100' : 'opacity-60 hover:opacity-100',
          ].join(' ')}>
            <span style={{ color }}>{FLOW_ARROW[flowDirection]}</span>
            {label && (
              <span className="text-[var(--text-muted)]">{label}</span>
            )}
            <span className="text-[var(--text-muted)] capitalize">{pipeType}</span>
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

// Edge registry
export const edgeTypes = {
  pipe: PipeEdge,
} as const
