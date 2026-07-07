// ============================================================
// ValueDisplayNode — Compact sensor value display
// Shows: label + live value + unit in a clean badge/card style
// Like "PE-1  7.2 бар" or "TE-3  36.6 °C"
// Supports runtime binding, inline label edit, configurable style
// ============================================================

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useDiagramStore } from '@/stores/useDiagramStore'
import { useUiStore } from '@/stores/useUiStore'
import { useRuntimeStore } from '@/stores/useRuntimeStore'
import { useTrendStore } from '@/stores/useTrendStore'
import { TrendCard } from '@/components/TrendCard'
import type { NodeRuntimeState, RuntimeStatus, ScadaNodeBinding } from '@/types/scada'

const STATUS_DOT: Record<RuntimeStatus, string> = {
  ok:      'bg-status-ok',
  warn:    'bg-status-warn',
  alert:   'bg-status-alert status-dot-pulse',
  off:     'bg-gray-500',
  offline: 'bg-gray-700',
  stale:   'bg-yellow-600 status-dot-pulse',
  unknown: 'bg-gray-600',
}

const STATUS_BORDER: Record<RuntimeStatus, string> = {
  ok:      'border-status-ok/30',
  warn:    'border-status-warn/30',
  alert:   'border-status-alert/40',
  off:     'border-gray-600/30',
  offline: 'border-gray-700/30',
  stale:   'border-yellow-600/30',
  unknown: 'border-surface-border',
}

// Stable empty fallbacks — zustand v5 selectors must not return fresh refs
// (a new object/array each render → "Maximum update depth exceeded")
const EMPTY_SIZE = { width: 120, height: 25 }
const EMPTY_VALUE_STYLE: ValueStyleConfig = {}
const EMPTY_BINDINGS: ScadaNodeBinding[] = []

interface ValueDisplayData {
  label?: string
  [key: string]: unknown
}

interface ValueStyleConfig {
  // Layout
  layout?: 'horizontal' | 'vertical' | 'badge'
  // Typography
  labelFontSize?: number
  valueFontSize?: number
  labelColor?: string
  valueColor?: string
  unitColor?: string
  // Box
  bgColor?: string
  borderRadius?: number
  borderColor?: string
  showBorder?: boolean
  borderWidth?: number
  opacity?: number
  // Status
  showStatusDot?: boolean
  showStatusBorder?: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ValueDisplayNode({ id, data, selected }: NodeProps<any>) {
  const d = data as ValueDisplayData
  const label = (d.label as string) ?? 'Value'
  const mode = useUiStore((s) => s.mode)
  const isEditMode = mode === 'edit'

  const runtime: NodeRuntimeState | null = useRuntimeStore((s) => s.nodeRuntimeMap[id] ?? null)
  const status: RuntimeStatus = runtime?.primaryStatus ?? 'unknown'

  const nodeSize = useDiagramStore((s) => s.nodes.find((nd) => nd.id === id)?.size) ?? EMPTY_SIZE

  const styleRaw = useDiagramStore((s) => s.nodes.find((nd) => nd.id === id)?.style)
  const styleConfig: ValueStyleConfig = (styleRaw as ValueStyleConfig | undefined) ?? EMPTY_VALUE_STYLE

  // Read bindings from store for showTrend flag
  const bindingsRaw = useDiagramStore((s) => s.nodes.find((nd) => nd.id === id)?.bindings)
  const nodeBindings: ScadaNodeBinding[] = bindingsRaw ?? EMPTY_BINDINGS
  const trendBinding = nodeBindings.find((b) => b.showTrend && (b.isPrimary || nodeBindings.length === 1))
    || nodeBindings.find((b) => b.showTrend)
  const trendChannelId = trendBinding?.sensorChannelId
  const trendPoints = useTrendStore((s) => trendChannelId ? s.trends[trendChannelId]?.points ?? null : null)

  const layout = styleConfig.layout ?? 'horizontal'
  const labelFs = styleConfig.labelFontSize ?? 10
  const valueFs = styleConfig.valueFontSize ?? 16
  const labelColor = styleConfig.labelColor ?? 'var(--text-muted)'
  const valueColor = styleConfig.valueColor ?? 'var(--text-primary)'
  const unitColor = styleConfig.unitColor ?? 'var(--text-muted)'
  const bgColor = styleConfig.bgColor ?? 'var(--surface-bg)'
  const showBorder = styleConfig.showBorder !== false
  const borderW = showBorder ? (styleConfig.borderWidth ?? 1) : 0
  const borderColor = styleConfig.borderColor ?? 'var(--surface-border)'
  const borderRadius = styleConfig.borderRadius ?? 8
  const opacity = styleConfig.opacity ?? 1
  const showStatusDot = styleConfig.showStatusDot !== false
  const showStatusBorder = styleConfig.showStatusBorder ?? true

  // Runtime values
  const displayValue = runtime?.primaryValue != null
    ? runtime.primaryValue.toFixed(runtime.primaryPrecision ?? 1)
    : '—'
  const displayUnit = runtime?.primaryUnit ?? ''

  // All bindings for multi-value display in vertical layout
  const allBindings = runtime?.allBindings ?? []

  // Inline edit
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(label)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) setEditValue(label)
  }, [label, editing])

  const commit = useCallback(() => {
    setEditing(false)
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== label) {
      useDiagramStore.getState().updateNode(id, { label: trimmed })
    } else {
      setEditValue(label)
    }
  }, [editValue, label, id])

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!isEditMode) return
    e.stopPropagation()
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') { setEditValue(label); setEditing(false) }
    e.stopPropagation()
  }

  const handleConfigure = (e: React.MouseEvent) => {
    e.stopPropagation()
    useUiStore.getState().openNodeConfig(id)
  }

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

  // ── Render helpers ──────────────────────────────────────────

  const renderLabel = () => {
    if (editing) {
      return (
        <input
          ref={inputRef}
          className="nodrag nopan bg-transparent border-none outline-none text-center px-0.5"
          style={{ fontSize: labelFs, color: labelColor, width: Math.max(30, nodeSize.width * 0.4) }}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      )
    }
    return (
      <span
        className="font-semibold truncate leading-tight"
        style={{ fontSize: labelFs, color: labelColor, maxWidth: nodeSize.width * 0.45 }}
        onDoubleClick={handleDoubleClick}
        title={label}
      >
        {label}
      </span>
    )
  }

  const renderValue = (
    val: string = displayValue,
    unit: string = displayUnit,
    fs: number = valueFs,
  ) => (
    <span className="font-mono font-bold leading-none whitespace-nowrap" style={{ fontSize: fs, color: valueColor }}>
      {val}
      {unit && (
        <span className="font-normal ml-0.5" style={{ fontSize: Math.max(8, fs - 3), color: unitColor }}>
          {unit}
        </span>
      )}
    </span>
  )

  // ── Layout renders ─────────────────────────────────────────

  const renderHorizontal = () => (
    <div className="flex items-center gap-1.5 w-full h-full px-2">
      <div className="flex items-center gap-1.5 min-w-0 flex-shrink-0">
        {showStatusDot && <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[status]}`} />}
        {renderLabel()}
      </div>

      <div className="flex-shrink-0 ml-auto">{renderValue()}</div>
    </div>
  )

  const renderVertical = () => (
    <div className="flex flex-col items-center justify-center gap-0.5 w-full h-full py-1 px-2">
      <div className="flex items-center gap-1">
        {showStatusDot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[status]}`} />}
        {renderLabel()}
      </div>
      {allBindings.length > 1 ? (
        <div className="flex flex-col items-center gap-0.5 mt-0.5">
          {allBindings.map((b) => (
            <div key={b.bindingId} className="flex items-center gap-1">
              <span className="text-[9px] font-medium truncate" style={{ color: labelColor, maxWidth: 50 }}>
                {b.displayLabel ?? b.bindingKey}
              </span>
              {renderValue(
                b.value != null ? b.value.toFixed(b.precision ?? 1) : '—',
                b.unitOverride ?? b.unit ?? '',
                Math.max(10, valueFs - 2),
              )}
            </div>
          ))}
        </div>
      ) : (
        renderValue()
      )}
    </div>
  )

  const renderBadge = () => (
    <div className="flex items-center justify-center gap-1 w-full h-full px-2">
      {renderValue()}
    </div>
  )

  const trendActive = !!(trendPoints && trendPoints.length >= 2)
  const chartH = 70  // chart area height when trend is active

  // Compute border color once
  const resolvedBorderColor = showBorder
    ? (showStatusBorder && status === 'alert' ? 'var(--color-status-alert)'
      : showStatusBorder && status === 'warn' ? 'var(--color-status-warn)'
      : borderColor)
    : 'transparent'

  return (
    <>
      {/* Chart area — extends above, same card look */}
      {trendActive && (
        <div
          className="absolute overflow-hidden"
          style={{
            left: 0,
            bottom: nodeSize.height - borderW,
            width: nodeSize.width,
            height: chartH,
            backgroundColor: bgColor,
            borderStyle: 'solid',
            borderWidth: borderW,
            borderColor: resolvedBorderColor,
            borderTopLeftRadius: borderRadius,
            borderTopRightRadius: borderRadius,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            borderBottomWidth: 0,
            opacity,
          }}
        >
          <TrendCard
            data={trendPoints!}
            hours={trendBinding?.trendHours ?? 1}
            color={valueColor}
            width={nodeSize.width - borderW * 2}
            height={chartH - borderW}
            hideHeader
            transparent
            compact
          />
        </div>
      )}

      <div
        className={[
          'relative overflow-hidden transition-all duration-200',
          isEditMode && selected ? 'shadow-node-selected' : '',
          isEditMode ? 'scada-node-edit' : 'scada-node-view',
          showStatusBorder && status !== 'unknown' ? STATUS_BORDER[status] : '',
        ].join(' ')}
        style={{
          width: nodeSize.width,
          height: nodeSize.height,
          backgroundColor: bgColor,
          borderStyle: 'solid',
          borderWidth: borderW,
          borderColor: resolvedBorderColor,
          borderTopLeftRadius: trendActive ? 0 : borderRadius,
          borderTopRightRadius: trendActive ? 0 : borderRadius,
          borderBottomLeftRadius: borderRadius,
          borderBottomRightRadius: borderRadius,
          opacity,
        }}
      >
        {layout === 'horizontal' && renderHorizontal()}
        {layout === 'vertical' && renderVertical()}
        {layout === 'badge' && renderBadge()}

        {/* Placeholder in edit mode when no binding */}
        {isEditMode && !runtime && layout !== 'badge' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-[10px] text-[var(--text-muted)] opacity-50 italic">
              No sensor bound
            </span>
          </div>
        )}
      </div>

      {/* Handles */}
      <Handle type="source" position={Position.Top}    id="t" className="scada-handle !z-[10]" />
      <Handle type="source" position={Position.Left}   id="l" className="scada-handle !z-[10]" />
      <Handle type="source" position={Position.Bottom} id="b" className="scada-handle !z-[10]" />
      <Handle type="source" position={Position.Right}  id="r" className="scada-handle !z-[10]" />

      {/* Toolbar */}
      {isEditMode && selected && (
        <div
          className="absolute -top-9 left-1/2 -translate-x-1/2 flex gap-1 bg-surface border border-surface-border rounded-lg px-1 py-0.5 shadow-panel nodrag nopan"
          style={{ zIndex: 20 }}
        >
          <button
            onClick={handleConfigure}
            className="p-1 rounded hover:bg-accent/20 text-[var(--text-secondary)] hover:text-accent transition-colors"
            title="Configure"
          >
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <circle cx="8" cy="8" r="3" />
              <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4" strokeLinecap="round" />
            </svg>
          </button>
          <button
            onClick={handleDuplicate}
            className="p-1 rounded hover:bg-accent/20 text-[var(--text-secondary)] hover:text-accent transition-colors"
            title="Duplicate"
          >
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <rect x="2" y="4" width="8" height="8" rx="1" />
              <path d="M6 4V2.5A.5.5 0 016.5 2H13.5a.5.5 0 01.5.5V9.5a.5.5 0 01-.5.5H12" />
            </svg>
          </button>
          <button
            onClick={handleDelete}
            className="p-1 rounded hover:bg-red-500/20 text-[var(--text-secondary)] hover:text-status-alert transition-colors"
            title="Delete"
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
