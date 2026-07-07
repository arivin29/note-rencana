// ============================================================
// ZoneNode — labeled container/block (IPA, DMA, area) that groups
// nodes visually and shows an AGGREGATE status derived from the
// runtime status of the nodes geometrically inside its bounds.
// MVP: no true parenting — "inside" = node center within the box.
// ============================================================

import React, { useState } from 'react'
import { NodeResizer, type NodeProps } from '@xyflow/react'
import { useDiagramStore } from '@/stores/useDiagramStore'
import { useRuntimeStore } from '@/stores/useRuntimeStore'
import { useUiStore } from '@/stores/useUiStore'
import type { RuntimeStatus } from '@/types/scada'

const STATUS_RANK: Record<string, number> = {
  alert: 5, warn: 4, stale: 3, offline: 2, ok: 1, unknown: 0,
}
const STATUS_COLOR: Record<string, string> = {
  alert: '#ef4444', warn: '#f59e0b', ok: '#22c55e',
  stale: '#eab308', offline: '#6b7280', unknown: '#64748b',
}
const STATUS_LABEL: Record<string, string> = {
  alert: 'Alert', warn: 'Warn', ok: 'OK', stale: 'Stale', offline: 'Offline', unknown: '—',
}

export function ZoneNode({ id, selected }: NodeProps<any>) {
  const self       = useDiagramStore((s) => s.nodes.find((n) => n.id === id))
  const nodes      = useDiagramStore((s) => s.nodes)
  const updateNode = useDiagramStore((s) => s.updateNode)
  const runtimeMap = useRuntimeStore((s) => s.nodeRuntimeMap)
  const isEditMode = useUiStore((s) => s.mode) === 'edit'
  const openNodeConfig = useUiStore((s) => s.openNodeConfig)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  if (!self) return null

  const zx = self.position.x
  const zy = self.position.y
  const zw = self.size?.width ?? 320
  const zh = self.size?.height ?? 200

  // Aggregate status from nodes whose center falls inside this zone
  let worst: RuntimeStatus = 'unknown'
  let contained = 0
  let alertCount = 0
  for (const n of nodes) {
    if (n.id === id || n.type === 'zone') continue
    const cx = n.position.x + (n.size?.width ?? 0) / 2
    const cy = n.position.y + (n.size?.height ?? 0) / 2
    if (cx >= zx && cx <= zx + zw && cy >= zy && cy <= zy + zh) {
      contained++
      const st = (runtimeMap[n.id]?.primaryStatus ?? 'unknown') as RuntimeStatus
      if (st === 'alert') alertCount++
      if ((STATUS_RANK[st] ?? 0) > (STATUS_RANK[worst] ?? 0)) worst = st
    }
  }

  const statusColor = STATUS_COLOR[worst] ?? '#64748b'
  const st = (self.style ?? {}) as Record<string, any>
  // Frame color: follow aggregate status (default) OR a fixed user color
  const color = (st.zoneColorMode === 'fixed' && st.accentColor) ? st.accentColor : statusColor
  const fillPct = st.zoneFill ?? 9
  const bracketsOn = st.zoneBrackets !== false
  const label = self.label || 'Zona'
  const locked = (self.config as any)?.locked === true
  // Border style: explicit override, else auto (dashed unlocked / solid locked)
  const borderStyle: string = st.zoneBorder === 'solid' ? 'solid'
    : st.zoneBorder === 'dashed' ? 'dashed'
    : st.zoneBorder === 'none' ? 'none'
    : (locked ? 'solid' : 'dashed')
  const hex2 = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')
  const fillA = hex2((fillPct / 100) * 255)

  const commitLabel = () => {
    const v = draft.trim()
    if (v && v !== label) updateNode(id, { label: v })
    setEditing(false)
  }

  return (
    <>
      {isEditMode && !locked && (
        <NodeResizer
          isVisible={selected}
          minWidth={160}
          minHeight={100}
          onResize={(_, p) => updateNode(id, { position: { x: p.x, y: p.y }, size: { width: p.width, height: p.height } })}
          lineStyle={{ borderColor: color, opacity: 0.5 }}
          handleStyle={{ width: 8, height: 8, borderRadius: 2, background: color }}
        />
      )}

      {/* Container body — gradient tint, border style, alert halo */}
      <div
        className="w-full h-full rounded-xl transition-all duration-200"
        style={{
          background: `linear-gradient(155deg, ${color}${fillA} 0%, ${color}${hex2((fillPct * 0.4 / 100) * 255)} 40%, transparent 100%)`,
          border: borderStyle === 'none' ? 'none' : `1.5px ${borderStyle} ${color}55`,
          boxShadow: worst === 'alert'
            ? `inset 0 0 24px -6px ${statusColor}66, 0 0 18px -5px ${statusColor}88`
            : selected ? `0 0 0 1.5px ${color}66` : 'none',
        }}
      />

      {/* Corner brackets — HUD/technical framing */}
      {bracketsOn && ([
        'top-1.5 left-1.5 border-t-2 border-l-2 rounded-tl-md',
        'top-1.5 right-1.5 border-t-2 border-r-2 rounded-tr-md',
        'bottom-1.5 left-1.5 border-b-2 border-l-2 rounded-bl-md',
        'bottom-1.5 right-1.5 border-b-2 border-r-2 rounded-br-md',
      ]).map((cls, i) => (
        <div key={i} className={`absolute w-3.5 h-3.5 pointer-events-none ${cls}`} style={{ borderColor: color, opacity: 0.7 }} />
      ))}

      {/* Header pill — sits on the top-left edge */}
      <div
        className="absolute left-3 flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-lg select-none"
        style={{
          top: -15,
          background: 'var(--surface-bg)',
          border: `1px solid ${color}55`,
          boxShadow: `0 3px 10px -3px #000a`,
        }}
      >
        {/* group / layers icon */}
        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke={color} strokeWidth={1.4} strokeLinejoin="round">
          <path d="M8 2L14 5L8 8L2 5L8 2Z" /><path d="M2 8L8 11L14 8" opacity={0.55} /><path d="M2 11L8 14L14 11" opacity={0.3} />
        </svg>
        <span
          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${worst === 'alert' ? 'status-dot-pulse' : ''}`}
          style={{ background: statusColor, boxShadow: `0 0 6px 1px ${statusColor}88` }}
          title={STATUS_LABEL[worst]}
        />
        {editing && isEditMode ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitLabel}
            onKeyDown={(e) => { if (e.key === 'Enter') commitLabel(); if (e.key === 'Escape') setEditing(false) }}
            className="bg-canvas border border-surface-border rounded px-1 text-xs text-[var(--text-primary)] outline-none w-40 nodrag"
          />
        ) : (
          <span
            className="text-xs font-semibold text-[var(--text-primary)] whitespace-nowrap tracking-wide"
            onDoubleClick={() => { if (isEditMode) { setDraft(label); setEditing(true) } }}
            title={isEditMode ? 'Double-click untuk ganti nama' : undefined}
          >
            {label}
          </span>
        )}
        <span className="w-px h-3.5" style={{ background: color + '44' }} />
        <span
          className="text-[10px] font-mono px-1.5 py-0.5 rounded whitespace-nowrap"
          style={{ background: color + '22', color }}
        >
          {contained} node{alertCount > 0 ? ` · ${alertCount} alert` : ''}
        </span>
        {isEditMode && (
          <button
            onClick={(e) => { e.stopPropagation(); openNodeConfig(id) }}
            className="nodrag w-4 h-4 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="Atur style zona"
          >
            <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={1.4}>
              <circle cx="8" cy="8" r="2" />
              <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.5 3.5l1.4 1.4M11.1 11.1l1.4 1.4M12.5 3.5l-1.4 1.4M4.9 11.1l-1.4 1.4" strokeLinecap="round" />
            </svg>
          </button>
        )}
        {isEditMode && (
          <button
            onClick={(e) => { e.stopPropagation(); updateNode(id, { config: { ...self.config, locked: !locked } }) }}
            className="nodrag w-4 h-4 flex items-center justify-center rounded transition-colors"
            style={{ color: locked ? color : 'var(--text-muted)' }}
            title={locked ? 'Terkunci — klik untuk buka (biar bisa digeser/resize)' : 'Kunci posisi & ukuran zona'}
          >
            {locked ? (
              <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={1.4}>
                <rect x="3.5" y="7" width="9" height="6" rx="1" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={1.4}>
                <rect x="3.5" y="7" width="9" height="6" rx="1" /><path d="M5.5 7V5a2.5 2.5 0 0 1 4.9-.6" />
              </svg>
            )}
          </button>
        )}
      </div>
    </>
  )
}
