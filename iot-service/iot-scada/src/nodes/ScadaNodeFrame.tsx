// ============================================================
// SCADA Node Frame — Shared wrapper untuk semua node types
// Menampilkan: glyph, label, runtime badge, value, status
// ============================================================

import React from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeRuntimeState, RuntimeStatus } from '@/types/scada'

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

// ── Icon SVGs per node type ───────────────────────────────────

const NodeGlyph: Record<string, React.ReactNode> = {
  pump: (
    <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12l4-4 4 4M12 8v8" />
    </svg>
  ),
  valve: (
    <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" stroke="currentColor" strokeWidth={1.5}>
      <path d="M4 12h4l4-4 4 4h4"/>
      <rect x="10" y="8" width="4" height="8" rx="1" />
    </svg>
  ),
  flowmeter: (
    <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l4 2" />
    </svg>
  ),
  pressure: (
    <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="14" r="7" />
      <path d="M12 7V5M9 8.3L7.5 6.8M15 8.3L16.5 6.8" />
      <path d="M12 14 L14.5 11" strokeLinecap="round" />
    </svg>
  ),
  reservoir: (
    <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M3 12h18" strokeDasharray="2 2"/>
      <path d="M7 7V4M17 7V4" />
    </svg>
  ),
  intake: (
    <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" stroke="currentColor" strokeWidth={1.5}>
      <path d="M3 18c1-6 4-10 9-10s8 4 9 10" />
      <path d="M9 18v-4M12 18v-6M15 18v-4" />
    </svg>
  ),
  wtp: (
    <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="8" width="18" height="11" rx="2" />
      <path d="M3 12h18M9 8V5h6v3M8 15.5h8" />
    </svg>
  ),
  junction: (
    <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      <path d="M12 3v6M12 15v6M3 12h6M15 12h6" />
    </svg>
  ),
}

// ── Component ─────────────────────────────────────────────────

interface ScadaNodeFrameProps {
  id: string
  nodeType: string
  label: string
  selected?: boolean
  runtime?: NodeRuntimeState | null
  isEditMode?: boolean
  children?: React.ReactNode
}

export function ScadaNodeFrame({
  id: _id,
  nodeType,
  label,
  selected = false,
  runtime,
  isEditMode = false,
}: ScadaNodeFrameProps) {
  const status: RuntimeStatus = runtime?.primaryStatus ?? 'unknown'
  const ringClass = STATUS_RING[status] ?? STATUS_RING.unknown
  const dotClass  = STATUS_DOT[status]  ?? STATUS_DOT.unknown
  const glyph     = NodeGlyph[nodeType] ?? NodeGlyph.junction

  const displayValue = runtime?.primaryValue != null
    ? runtime.primaryValue.toFixed(runtime.primaryPrecision ?? 1)
    : null

  const displayUnit = runtime?.primaryUnit ?? ''

  return (
    <>
      {/* Handles — top, bottom, left, right */}
      <Handle type="target" position={Position.Top}    id="t" />
      <Handle type="target" position={Position.Left}   id="l" />
      <Handle type="source" position={Position.Bottom} id="b" />
      <Handle type="source" position={Position.Right}  id="r" />

      {/* Node body */}
      <div
        className={[
          'relative flex flex-col items-center justify-start',
          'w-full h-full rounded-xl cursor-pointer',
          'bg-surface border border-surface-border',
          'ring-1 transition-all duration-200',
          ringClass,
          selected ? 'ring-2 ring-accent shadow-node-selected' : 'ring-1',
          isEditMode ? 'hover:border-accent/40' : '',
        ].join(' ')}
        style={{ minWidth: 80, minHeight: 80 }}
      >
        {/* Status dot */}
        <div className="absolute top-1.5 right-1.5">
          <span className={`inline-block w-2 h-2 rounded-full ${dotClass}`} />
        </div>

        {/* Glyph icon */}
        <div className={[
          'mt-3 text-gray-300 transition-colors duration-200',
          status === 'alert'   ? 'text-status-alert' : '',
          status === 'warn'    ? 'text-status-warn'  : '',
          status === 'ok'      ? 'text-status-ok'    : '',
          status === 'offline' ? 'text-gray-600'     : '',
        ].join(' ')}>
          {glyph}
        </div>

        {/* Live value */}
        {displayValue !== null && (
          <div className="mt-1 text-center">
            <span className="value-display text-[var(--text-primary)] font-semibold">
              {displayValue}
            </span>
            {displayUnit && (
              <span className="value-display text-[var(--text-muted)] ml-0.5">
                {displayUnit}
              </span>
            )}
          </div>
        )}

        {/* Label */}
        <div className="mt-1 px-1 pb-1.5 text-center">
          <span className="text-[10px] font-medium text-[var(--text-secondary)] leading-tight block truncate max-w-full">
            {label}
          </span>
        </div>

        {/* Status badge — only for non-ok states */}
        {status !== 'ok' && status !== 'unknown' && displayValue !== null && (
          <div className={[
            'absolute bottom-0.5 left-1/2 -translate-x-1/2',
            'text-[8px] font-semibold px-1 rounded',
            status === 'alert'   ? 'text-status-alert'  : '',
            status === 'warn'    ? 'text-status-warn'   : '',
            status === 'offline' ? 'text-gray-500'      : '',
            status === 'stale'   ? 'text-yellow-500'    : '',
            status === 'off'     ? 'text-gray-500'      : '',
          ].join(' ')}>
            {STATUS_LABEL[status]}
          </div>
        )}
      </div>
    </>
  )
}
