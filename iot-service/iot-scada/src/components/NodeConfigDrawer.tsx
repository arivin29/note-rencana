// ============================================================
// NodeConfigDrawer — Full-featured node configuration drawer
// Tabs: General | Bindings | Appearance
// Opens via gear icon on node action toolbar (edit mode)
// ============================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useUiStore } from '@/stores/useUiStore'
import { useDiagramStore } from '@/stores/useDiagramStore'
import { scadaBindingOptionsControllerFindAll } from '@/sdk/services.gen'
import type {
  ScadaNodeBinding,
  ScadaNodeType,
  NodeStyleConfig,
} from '@/types/scada'
import { NODE_LIBRARY } from '@/nodes/registry'
import { SENSOR_CATEGORY_LIST } from '@/nodes/sensorCategories'

// ── Tab types ─────────────────────────────────────────────────

type ConfigTab = 'general' | 'bindings' | 'appearance'

const TABS: { key: ConfigTab; label: string; icon: React.ReactNode }[] = [
  {
    key: 'general',
    label: 'General',
    icon: (
      <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <rect x="3" y="3" width="10" height="10" rx="2" />
      </svg>
    ),
  },
  {
    key: 'bindings',
    label: 'Bindings',
    icon: (
      <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path d="M4 8h8M8 4v8" strokeLinecap="round" />
        <circle cx="4" cy="8" r="2" />
        <circle cx="12" cy="8" r="2" />
      </svg>
    ),
  },
  {
    key: 'appearance',
    label: 'Appearance',
    icon: (
      <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <circle cx="8" cy="8" r="5" />
        <path d="M8 3v2M8 11v2M3 8h2M11 8h2" strokeLinecap="round" />
      </svg>
    ),
  },
]

// ── Built-in icon gallery (includes all node types + extras) ──

const BUILTIN_ICONS: { key: string; label: string; svg: string }[] = [
  { key: 'pump', label: 'Pump', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M8 12l4-4 4 4M12 8v8"/></svg>' },
  { key: 'valve', label: 'Valve', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 12h4l4-4 4 4h4"/><rect x="10" y="8" width="4" height="8" rx="1"/></svg>' },
  { key: 'flowmeter', label: 'Flow Meter', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/></svg>' },
  { key: 'pressure', label: 'Pressure', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="14" r="7"/><path d="M12 7V5M9 8.3L7.5 6.8M15 8.3L16.5 6.8"/><path d="M12 14 L14.5 11" stroke-linecap="round"/></svg>' },
  { key: 'reservoir', label: 'Reservoir', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M3 12h18" stroke-dasharray="2 2"/><path d="M7 7V4M17 7V4"/></svg>' },
  { key: 'intake', label: 'Intake', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 18c1-6 4-10 9-10s8 4 9 10"/><path d="M9 18v-4M12 18v-6M15 18v-4"/></svg>' },
  { key: 'wtp', label: 'WTP', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="8" width="18" height="11" rx="2"/><path d="M3 12h18M9 8V5h6v3M8 15.5h8"/></svg>' },
  { key: 'junction', label: 'Junction', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3" fill="currentColor"/><path d="M12 3v6M12 15v6M3 12h6M15 12h6"/></svg>' },
  { key: 'tank', label: 'Tank', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="4" width="14" height="16" rx="3"/><path d="M5 10h14"/><path d="M9 14h6" stroke-dasharray="2 2"/></svg>' },
  { key: 'motor', label: 'Motor', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="8"/><text x="12" y="16" text-anchor="middle" font-size="10" fill="currentColor" stroke="none">M</text></svg>' },
  { key: 'generator', label: 'Generator', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="8"/><text x="12" y="16" text-anchor="middle" font-size="10" fill="currentColor" stroke="none">G</text></svg>' },
  { key: 'alarm', label: 'Alarm', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>' },
]

// ── Color presets ─────────────────────────────────────────────

const COLOR_PRESETS = [
  '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
  '#ec4899', '#ef4444', '#f97316', '#f59e0b', '#22c55e',
  '#14b8a6', '#06b6d4', '#6b7280', '#8b949e', '#e6edf3',
]

// ── Binding channel search result ─────────────────────────────

interface ChannelOption {
  channelId: string
  metricCode: string
  sensorName: string
  sensorCode: string
  nodeName: string
  nodeCode: string
  nodeAddress: string
  projectName: string
  category: string
  unit: string
  precision: number
  minThreshold: number | null
  maxThreshold: number | null
}

// ── Helper: parse style config from node ──────────────────────

function getStyleConfig(style?: Record<string, unknown>): NodeStyleConfig {
  if (!style) return {}
  return {
    renderMode: (style.renderMode as NodeStyleConfig['renderMode']) ?? undefined,
    labelPlacement: (style.labelPlacement as NodeStyleConfig['labelPlacement']) ?? undefined,
    iconMode: (style.iconMode as NodeStyleConfig['iconMode']) ?? undefined,
    customSvg: (style.customSvg as string) ?? undefined,
    iconPosition: (style.iconPosition as NodeStyleConfig['iconPosition']) ?? undefined,
    accentColor: (style.accentColor as string) ?? undefined,
    bgColor: (style.bgColor as string) ?? undefined,
    borderColor: (style.borderColor as string) ?? undefined,
    borderWidth: (style.borderWidth as number) ?? undefined,
    showBorder: style.showBorder != null ? Boolean(style.showBorder) : undefined,
    borderRadius: (style.borderRadius as number) ?? undefined,
    opacity: (style.opacity as number) ?? undefined,
    bgImage: (style.bgImage as string) ?? undefined,
    bgImageFit: (style.bgImageFit as NodeStyleConfig['bgImageFit']) ?? undefined,
    iconSize: (style.iconSize as number) ?? undefined,
    labelFontSize: (style.labelFontSize as number) ?? undefined,
    valueFontSize: (style.valueFontSize as number) ?? undefined,
  }
}

// ── SectionTitle ──────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 mt-1">
      {children}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// GENERAL TAB
// ══════════════════════════════════════════════════════════════

function GeneralTab({ nodeId }: { nodeId: string }) {
  const node = useDiagramStore((s) => s.nodes.find((n) => n.id === nodeId))
  const updateNode = useDiagramStore((s) => s.updateNode)

  if (!node) return null

  const nodeLib = NODE_LIBRARY.find((n) => n.type === node.type)

  return (
    <div className="flex flex-col gap-4">
      {/* Node type indicator */}
      <div className="bg-canvas rounded-lg p-3 border border-surface-border flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-surface border border-surface-border flex items-center justify-center text-accent">
          <span className="text-sm font-bold uppercase font-mono">{node.type.slice(0, 3)}</span>
        </div>
        <div>
          <div className="text-sm font-semibold text-[var(--text-primary)]">{nodeLib?.label ?? node.type}</div>
          <div className="text-[10px] text-[var(--text-muted)]">{nodeLib?.description ?? 'Custom node type'}</div>
        </div>
      </div>

      {/* Label */}
      <div>
        <label className="scada-label">Label</label>
        <input
          className="scada-input"
          value={node.label}
          onChange={(e) => updateNode(nodeId, { label: e.target.value })}
          placeholder="Node label"
        />
      </div>

      {/* Node Type selector */}
      <div>
        <label className="scada-label">Node Type</label>
        <select
          className="scada-select"
          value={node.type}
          onChange={(e) => updateNode(nodeId, { type: e.target.value as ScadaNodeType })}
        >
          {NODE_LIBRARY.map((n) => (
            <option key={n.type} value={n.type}>{n.label}</option>
          ))}
        </select>
      </div>

      {/* Sensor Category — only when node type is 'sensor' */}
      {node.type === 'sensor' && (
        <div>
          <label className="scada-label">Sensor Category</label>
          <select
            className="scada-select"
            value={(node.config?.sensorCategory as string) ?? 'generic'}
            onChange={(e) =>
              updateNode(nodeId, {
                config: { ...node.config, sensorCategory: e.target.value },
              })
            }
          >
            {SENSOR_CATEGORY_LIST.map((cat) => (
              <option key={cat.key} value={cat.key}>
                {cat.label} {cat.unit ? `(${cat.unit})` : ''}
              </option>
            ))}
          </select>
          <div className="text-[10px] text-[var(--text-muted)] mt-1">
            Determines default icon &amp; accent color for this sensor node
          </div>
        </div>
      )}

      {/* Size */}
      <div>
        <SectionTitle>Size</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="scada-label">Width</label>
            <input
              className="scada-input"
              type="number"
              min={40}
              max={400}
              value={node.size?.width ?? 100}
              onChange={(e) => updateNode(nodeId, { size: { ...node.size, width: Number(e.target.value) || 100, height: node.size?.height ?? 100 } })}
            />
          </div>
          <div>
            <label className="scada-label">Height</label>
            <input
              className="scada-input"
              type="number"
              min={40}
              max={400}
              value={node.size?.height ?? 100}
              onChange={(e) => updateNode(nodeId, { size: { width: node.size?.width ?? 100, ...node.size, height: Number(e.target.value) || 100 } })}
            />
          </div>
        </div>
        {/* Quick size presets */}
        <div className="flex gap-1.5 mt-2">
          {[
            { label: 'S', w: 60, h: 60 },
            { label: 'M', w: 100, h: 100 },
            { label: 'L', w: 140, h: 140 },
            { label: 'XL', w: 180, h: 180 },
          ].map((p) => (
            <button
              key={p.label}
              onClick={() => updateNode(nodeId, { size: { width: p.w, height: p.h } })}
              className={[
                'btn-ghost text-[10px] px-2 py-1 rounded',
                (node.size?.width === p.w && node.size?.height === p.h) ? 'bg-accent/20 text-accent border-accent/30' : '',
              ].join(' ')}
            >
              {p.label} ({p.w}x{p.h})
            </button>
          ))}
        </div>
      </div>

      {/* Z-Index */}
      <div>
        <label className="scada-label">Z-Index (Layer)</label>
        <input
          className="scada-input"
          type="number"
          value={node.zIndex ?? 0}
          onChange={(e) => updateNode(nodeId, { zIndex: Number(e.target.value) || 0 })}
        />
      </div>

      {/* Position (readonly info) */}
      <div>
        <SectionTitle>Position</SectionTitle>
        <div className="grid grid-cols-2 gap-2 text-xs text-[var(--text-muted)] font-mono">
          <div className="bg-canvas rounded px-2 py-1 border border-surface-border">
            X: {Math.round(node.position?.x ?? 0)}
          </div>
          <div className="bg-canvas rounded px-2 py-1 border border-surface-border">
            Y: {Math.round(node.position?.y ?? 0)}
          </div>
        </div>
      </div>

      {/* ID info */}
      <div>
        <SectionTitle>Identifiers</SectionTitle>
        <div className="text-[10px] text-[var(--text-muted)] font-mono bg-canvas rounded-lg p-2 border border-surface-border break-all">
          <div>ID: {node.id}</div>
          {node.relatedSensorId && <div className="mt-0.5">Sensor: {node.relatedSensorId}</div>}
          {node.relatedNodeId && <div className="mt-0.5">Related: {node.relatedNodeId}</div>}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// BINDINGS TAB
// ══════════════════════════════════════════════════════════════

function BindingsTab({ nodeId }: { nodeId: string }) {
  const node = useDiagramStore((s) => s.nodes.find((n) => n.id === nodeId))
  const updateNode = useDiagramStore((s) => s.updateNode)
  const ownerId = useDiagramStore((s) => s.meta?.ownerId)

  const [channels, setChannels] = useState<ChannelOption[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  // Fetch channels from backend
  const fetchChannels = useCallback(async (q: string) => {
    setIsLoading(true)
    try {
      const res = await scadaBindingOptionsControllerFindAll({
        search: q || undefined,
        ownerId: ownerId || undefined,
      })
      const items = (res as any)?.data ?? []
      setChannels(items.map((ch: any) => ({
        channelId: ch.idSensorChannel ?? '',
        metricCode: ch.metricCode ?? '',
        sensorName: ch.sensor?.label ?? ch.sensor?.name ?? ch.metricCode ?? 'Unknown',
        sensorCode: ch.sensor?.sensorCode ?? '',
        nodeName: ch.node?.name || ch.node?.address || '',
        nodeCode: ch.node?.code ?? '',
        nodeAddress: ch.node?.address || '',
        projectName: ch.project?.name ?? '',
        category: ch.sensorType?.category ?? ch.sensorType?.name ?? '',
        unit: ch.unit ?? ch.sensorType?.defaultUnit ?? '',
        precision: ch.precision ?? ch.sensorType?.precision ?? 2,
        minThreshold: ch.minThreshold ?? null,
        maxThreshold: ch.maxThreshold ?? null,
      })))
    } catch {
      setChannels([])
    } finally {
      setIsLoading(false)
    }
  }, [ownerId])

  // Initial load when opening search
  useEffect(() => {
    if (showSearch) fetchChannels(search)
  }, [showSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  const handleSearch = useCallback((q: string) => {
    setSearch(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchChannels(q), 400)
  }, [fetchChannels])

  if (!node) return null

  const bindings: ScadaNodeBinding[] = node.bindings ?? []

  // Add a binding
  const addBinding = (ch: ChannelOption) => {
    // check duplicate
    if (bindings.some((b) => b.sensorChannelId === ch.channelId)) return

    // Build a meaningful display label
    const labelParts = [
      ch.sensorName !== ch.metricCode ? ch.sensorName : '',
      ch.metricCode,
    ].filter(Boolean)
    const displayLabel = labelParts.join(' — ') || ch.metricCode

    const newBinding: ScadaNodeBinding = {
      id: crypto.randomUUID(),
      bindingKey: ch.metricCode || `metric_${bindings.length + 1}`,
      sensorChannelId: ch.channelId,
      displayLabel,
      unitOverride: ch.unit || null,
      isPrimary: bindings.length === 0, // first binding is primary by default
      priorityOrder: bindings.length,
      transform: null,
    }
    updateNode(nodeId, { bindings: [...bindings, newBinding] })
    setShowSearch(false)
    setSearch('')
  }

  // Remove a binding
  const removeBinding = (bindingId: string) => {
    const updated = bindings.filter((b) => (b.id ?? '') !== bindingId)
    // If we removed the primary, set first remaining as primary
    if (updated.length > 0 && !updated.some((b) => b.isPrimary)) {
      updated[0] = { ...updated[0], isPrimary: true }
    }
    updateNode(nodeId, { bindings: updated })
  }

  // Toggle primary
  const setPrimary = (bindingId: string) => {
    const updated = bindings.map((b) => ({
      ...b,
      isPrimary: (b.id ?? '') === bindingId,
    }))
    updateNode(nodeId, { bindings: updated })
  }

  // Update binding field
  const updateBinding = (bindingId: string, patch: Partial<ScadaNodeBinding>) => {
    const updated = bindings.map((b) =>
      (b.id ?? '') === bindingId ? { ...b, ...patch } : b
    )
    updateNode(nodeId, { bindings: updated })
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Current bindings */}
      <div className="flex items-center justify-between">
        <SectionTitle>Sensor Bindings ({bindings.length})</SectionTitle>
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="btn-primary text-[10px] h-6 px-2 flex items-center gap-1"
        >
          <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M8 3v10M3 8h10" strokeLinecap="round" />
          </svg>
          Add
        </button>
      </div>

      {/* Binding search panel */}
      {showSearch && (
        <div className="bg-canvas border border-accent/30 rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <circle cx="7" cy="7" r="4" />
              <path d="M10 10l3 3" strokeLinecap="round" />
            </svg>
            <input
              className="scada-input flex-1 !mb-0"
              placeholder="Search sensor channels..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              autoFocus
            />
            <button
              onClick={() => { setShowSearch(false); setSearch('') }}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Results */}
          <div className="max-h-48 overflow-y-auto space-y-1">
            {isLoading ? (
              <div className="text-center py-4 text-xs text-[var(--text-muted)]">
                <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto mb-1" />
                Loading channels...
              </div>
            ) : channels.length === 0 ? (
              <div className="text-center py-4 text-xs text-[var(--text-muted)]">
                {search ? 'No channels found' : 'No channels available'}
              </div>
            ) : (
              channels.map((ch) => {
                const alreadyBound = bindings.some((b) => b.sensorChannelId === ch.channelId)
                // Build the best display name
                const displayName = ch.sensorName || ch.metricCode || 'Unnamed Channel'
                return (
                  <button
                    key={ch.channelId}
                    disabled={alreadyBound}
                    onClick={() => addBinding(ch)}
                    className={[
                      'w-full text-left p-2.5 rounded-lg border transition-colors text-xs',
                      alreadyBound
                        ? 'border-accent/20 bg-accent/5 opacity-50 cursor-not-allowed'
                        : 'border-surface-border hover:border-accent/40 hover:bg-surface',
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[var(--text-primary)] capitalize">
                        {displayName}
                      </span>
                      {alreadyBound && (
                        <span className="text-[9px] text-accent font-semibold">BOUND</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-[var(--text-muted)] flex-wrap">
                      <span className="font-mono bg-surface px-1 py-0.5 rounded text-[10px]">{ch.metricCode}</span>
                      {ch.unit && <span className="bg-surface px-1 py-0.5 rounded text-[10px]">{ch.unit}</span>}
                      {ch.category && <span className="text-[10px] truncate">{ch.category}</span>}
                    </div>
                    {/* Node info row: code + name/address */}
                    {(ch.nodeCode || ch.nodeName) && (
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-[var(--text-muted)]">
                        {ch.nodeCode && (
                          <span className="flex items-center gap-0.5 font-mono">
                            <svg viewBox="0 0 10 10" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
                              <rect x="1" y="2" width="8" height="6" rx="1" />
                            </svg>
                            {ch.nodeCode}
                          </span>
                        )}
                        {ch.nodeName && (
                          <span className="flex items-center gap-0.5 text-accent/80">
                            <svg viewBox="0 0 10 10" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
                              <path d="M5 1C3.3 1 2 2.3 2 4c0 2.5 3 5 3 5s3-2.5 3-5c0-1.7-1.3-3-3-3z" />
                              <circle cx="5" cy="4" r="1" />
                            </svg>
                            {ch.nodeName}
                          </span>
                        )}
                      </div>
                    )}
                    {/* Address row (if different from name) */}
                    {ch.nodeAddress && ch.nodeAddress !== ch.nodeName && (
                      <div className="flex items-center gap-0.5 mt-0.5 text-[10px] text-[var(--text-muted)] pl-0.5">
                        <svg viewBox="0 0 10 10" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
                          <path d="M5 1C3.3 1 2 2.3 2 4c0 2.5 3 5 3 5s3-2.5 3-5c0-1.7-1.3-3-3-3z" />
                          <circle cx="5" cy="4" r="1" />
                        </svg>
                        {ch.nodeAddress}
                      </div>
                    )}
                    {/* Project row */}
                    {ch.projectName && (
                      <div className="flex items-center gap-0.5 mt-0.5 text-[10px] text-[var(--text-muted)]">
                        <svg viewBox="0 0 10 10" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
                          <path d="M2 8V3l3-1.5L8 3v5" />
                        </svg>
                        {ch.projectName}
                      </div>
                    )}
                    {(ch.minThreshold != null || ch.maxThreshold != null) && (
                      <div className="mt-1 text-[9px] text-[var(--text-muted)] font-mono">
                        Range: {ch.minThreshold ?? '—'} ~ {ch.maxThreshold ?? '—'} {ch.unit}
                      </div>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Existing bindings list */}
      {bindings.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-surface-border rounded-xl">
          <svg viewBox="0 0 24 24" className="w-8 h-8 mx-auto mb-2 text-[var(--text-muted)]" fill="none" stroke="currentColor" strokeWidth={1}>
            <circle cx="12" cy="12" r="9" strokeDasharray="4 3" />
            <path d="M12 8v4l2 2" strokeLinecap="round" />
          </svg>
          <p className="text-xs text-[var(--text-muted)]">No bindings configured</p>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Click "Add" to link sensor channels</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {bindings.map((b, idx) => (
            <div
              key={b.id ?? idx}
              className={[
                'bg-canvas rounded-xl p-3 border transition-colors',
                b.isPrimary ? 'border-accent/40 bg-accent/5' : 'border-surface-border',
              ].join(' ')}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  {b.isPrimary && (
                    <span className="text-[9px] bg-accent/20 text-accent px-1.5 py-0.5 rounded font-bold uppercase">
                      Primary
                    </span>
                  )}
                  <span className="text-xs font-mono font-semibold text-[var(--text-primary)]">
                    {b.bindingKey}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {!b.isPrimary && (
                    <button
                      onClick={() => setPrimary(b.id ?? '')}
                      className="text-[9px] text-[var(--text-muted)] hover:text-accent px-1 py-0.5 rounded hover:bg-accent/10"
                      title="Set as primary"
                    >
                      Set Primary
                    </button>
                  )}
                  <button
                    onClick={() => removeBinding(b.id ?? '')}
                    className="p-0.5 rounded hover:bg-red-500/20 text-[var(--text-muted)] hover:text-status-alert"
                    title="Remove binding"
                  >
                    <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Binding details */}
              <div className="space-y-1.5">
                <div>
                  <label className="text-[9px] text-[var(--text-muted)] uppercase">Display Label</label>
                  <input
                    className="scada-input !text-xs !h-7 mt-0.5"
                    value={b.displayLabel ?? ''}
                    onChange={(e) => updateBinding(b.id ?? '', { displayLabel: e.target.value || null })}
                    placeholder="Auto-detected label"
                  />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="text-[9px] text-[var(--text-muted)] uppercase">Unit Override</label>
                    <input
                      className="scada-input !text-xs !h-7 mt-0.5"
                      value={b.unitOverride ?? ''}
                      onChange={(e) => updateBinding(b.id ?? '', { unitOverride: e.target.value || null })}
                      placeholder="Auto"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-[var(--text-muted)] uppercase">Binding Key</label>
                    <input
                      className="scada-input !text-xs !h-7 mt-0.5"
                      value={b.bindingKey}
                      onChange={(e) => updateBinding(b.id ?? '', { bindingKey: e.target.value || b.bindingKey })}
                    />
                  </div>
                </div>
                <div className="text-[9px] text-[var(--text-muted)] font-mono truncate">
                  Channel: {b.sensorChannelId}
                </div>

                {/* Show Trend toggle */}
                <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-surface-border/50">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none" title="Tampilkan sparkline trend chart di node">
                    <input
                      type="checkbox"
                      checked={b.showTrend ?? false}
                      onChange={(e) => updateBinding(b.id ?? '', { showTrend: e.target.checked })}
                      className="w-3 h-3 rounded border-gray-600 bg-canvas accent-accent cursor-pointer"
                    />
                    <span className="text-[9px] text-[var(--text-secondary)]">Show Trend Chart</span>
                  </label>
                  {b.showTrend && (
                    <select
                      className="scada-input !text-[9px] !h-5 !px-1 !py-0 !w-16"
                      value={b.trendHours ?? 1}
                      onChange={(e) => updateBinding(b.id ?? '', { trendHours: Number(e.target.value) })}
                      title="Jendela waktu trend"
                    >
                      <option value={1}>1 jam</option>
                      <option value={3}>3 jam</option>
                      <option value={6}>6 jam</option>
                      <option value={12}>12 jam</option>
                      <option value={24}>24 jam</option>
                    </select>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// APPEARANCE TAB
// ══════════════════════════════════════════════════════════════

function AppearanceTab({ nodeId }: { nodeId: string }) {
  const node = useDiagramStore((s) => s.nodes.find((n) => n.id === nodeId))
  const updateNode = useDiagramStore((s) => s.updateNode)

  const [customSvgInput, setCustomSvgInput] = useState('')

  if (!node) return null

  const styleConfig = getStyleConfig(node.style)

  const updateStyle = (patch: Partial<NodeStyleConfig>) => {
    updateNode(nodeId, {
      style: { ...node.style, ...patch },
    })
  }

  const iconMode = styleConfig.iconMode ?? 'builtin'

  // Node type flags — text_label and value_display don't need icon/glyph sections
  const isTextLabel = node.type === 'text_label'
  const isValueDisplay = node.type === 'value_display'
  const isSpecialNode = isTextLabel || isValueDisplay
  const showIconSections = !isSpecialNode

  const renderMode = styleConfig.renderMode ?? 'card'
  const labelPlacement = styleConfig.labelPlacement ?? 'bottom'

  return (
    <div className="flex flex-col gap-4">

      {/* ── Render Mode (equipment nodes only) ──────────── */}
      {showIconSections && (
        <div>
          <SectionTitle>Render Mode</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {([
              { key: 'card', label: 'Card', desc: 'Box with icon & border' },
              { key: 'schematic', label: 'Schematic', desc: 'P&ID symbol only' },
            ] as const).map((m) => (
              <button
                key={m.key}
                onClick={() => updateStyle({ renderMode: m.key })}
                className={[
                  'flex flex-col items-center gap-1 px-3 py-2 rounded-lg border text-[10px] transition-all',
                  renderMode === m.key
                    ? 'border-accent/50 bg-accent/10 text-accent'
                    : 'border-surface-border hover:border-accent/20 text-[var(--text-secondary)]',
                ].join(' ')}
              >
                <span className="font-semibold">{m.label}</span>
                <span className="text-[8px] text-[var(--text-muted)]">{m.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Label Placement (schematic mode) ──────────── */}
      {showIconSections && renderMode === 'schematic' && (
        <div>
          <SectionTitle>Label &amp; Value Position</SectionTitle>
          <div className="grid grid-cols-5 gap-1">
            {([
              { key: 'center', label: 'Center', icon: (
                <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1}>
                  <rect x="2" y="2" width="16" height="16" rx="2" opacity={0.3} />
                  <line x1="7" y1="10" x2="13" y2="10" strokeWidth={2} />
                </svg>
              )},
              { key: 'bottom', label: 'Bottom', icon: (
                <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1}>
                  <rect x="2" y="2" width="16" height="12" rx="2" opacity={0.3} />
                  <line x1="6" y1="17" x2="14" y2="17" strokeWidth={2} />
                </svg>
              )},
              { key: 'top', label: 'Top', icon: (
                <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1}>
                  <rect x="2" y="6" width="16" height="12" rx="2" opacity={0.3} />
                  <line x1="6" y1="3" x2="14" y2="3" strokeWidth={2} />
                </svg>
              )},
              { key: 'left', label: 'Left', icon: (
                <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1}>
                  <rect x="6" y="2" width="12" height="16" rx="2" opacity={0.3} />
                  <line x1="3" y1="8" x2="3" y2="12" strokeWidth={2} />
                </svg>
              )},
              { key: 'right', label: 'Right', icon: (
                <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1}>
                  <rect x="2" y="2" width="12" height="16" rx="2" opacity={0.3} />
                  <line x1="17" y1="8" x2="17" y2="12" strokeWidth={2} />
                </svg>
              )},
            ] as const).map((p) => (
              <button
                key={p.key}
                onClick={() => updateStyle({ labelPlacement: p.key as any })}
                className={[
                  'flex flex-col items-center gap-0.5 py-1.5 rounded-lg border text-[8px] transition-all',
                  labelPlacement === p.key
                    ? 'border-accent/50 bg-accent/10 text-accent'
                    : 'border-surface-border hover:border-accent/20 text-[var(--text-muted)]',
                ].join(' ')}
                title={p.label}
              >
                {p.icon}
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── TextLabel-specific settings ──────────────────── */}
      {isTextLabel && (
        <div>
          <SectionTitle>Text Settings</SectionTitle>
          <div className="space-y-3">
            {/* Font Size */}
            <div>
              <label className="text-[9px] text-[var(--text-muted)] uppercase mb-1 block">Font Size</label>
              <div className="flex items-center gap-2">
                <input
                  type="range" min={8} max={48}
                  value={(node.style as any)?.fontSize ?? 14}
                  onChange={(e) => updateStyle({ fontSize: Number(e.target.value) } as any)}
                  className="flex-1 accent-accent h-1 bg-canvas rounded"
                />
                <span className="text-xs text-[var(--text-secondary)] font-mono w-10 text-right">
                  {(node.style as any)?.fontSize ?? 14}px
                </span>
              </div>
            </div>
            {/* Font Weight */}
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-[var(--text-secondary)]">Bold</label>
              <button
                onClick={() => updateStyle({ fontWeight: ((node.style as any)?.fontWeight === 'bold' ? 'normal' : 'bold') } as any)}
                className={[
                  'w-9 h-5 rounded-full transition-colors relative',
                  (node.style as any)?.fontWeight === 'bold' ? 'bg-accent' : 'bg-gray-600',
                ].join(' ')}
              >
                <span className={[
                  'absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform',
                  (node.style as any)?.fontWeight === 'bold' ? 'left-[18px]' : 'left-0.5',
                ].join(' ')} />
              </button>
            </div>
            {/* Text Color */}
            <div>
              <label className="text-[9px] text-[var(--text-muted)] uppercase mb-1 block">Text Color</label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => updateStyle({ fontColor: undefined } as any)}
                  className={[
                    'w-6 h-6 rounded border-2 transition-all flex items-center justify-center',
                    !(node.style as any)?.fontColor ? 'border-accent scale-110' : 'border-surface-border hover:border-accent/40',
                  ].join(' ')}
                  title="Default"
                >
                  <span className="text-[7px] text-[var(--text-muted)]">D</span>
                </button>
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    onClick={() => updateStyle({ fontColor: c } as any)}
                    className={[
                      'w-6 h-6 rounded border-2 transition-all',
                      (node.style as any)?.fontColor === c ? 'border-white scale-110' : 'border-transparent hover:border-white/30',
                    ].join(' ')}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>
            {/* Text Align */}
            <div>
              <label className="text-[9px] text-[var(--text-muted)] uppercase mb-1 block">Alignment</label>
              <div className="flex gap-1">
                {(['left', 'center', 'right'] as const).map((a) => (
                  <button
                    key={a}
                    onClick={() => updateStyle({ textAlign: a } as any)}
                    className={[
                      'flex-1 text-[10px] py-1.5 rounded-lg border transition-colors capitalize',
                      ((node.style as any)?.textAlign ?? 'center') === a
                        ? 'bg-accent/10 border-accent/40 text-accent'
                        : 'bg-canvas border-surface-border text-[var(--text-muted)] hover:border-accent/20',
                    ].join(' ')}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
            {/* Show Background */}
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-[var(--text-secondary)]">Show Background</label>
              <button
                onClick={() => updateStyle({ showBg: !((node.style as any)?.showBg ?? false) } as any)}
                className={[
                  'w-9 h-5 rounded-full transition-colors relative',
                  ((node.style as any)?.showBg ?? false) ? 'bg-accent' : 'bg-gray-600',
                ].join(' ')}
              >
                <span className={[
                  'absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform',
                  ((node.style as any)?.showBg ?? false) ? 'left-[18px]' : 'left-0.5',
                ].join(' ')} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ValueDisplay-specific settings ───────────────── */}
      {isValueDisplay && (
        <div>
          <SectionTitle>Display Layout</SectionTitle>
          <div className="space-y-3">
            {/* Layout mode */}
            <div className="flex gap-1">
              {(['horizontal', 'vertical', 'badge'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => updateStyle({ layout: l } as any)}
                  className={[
                    'flex-1 text-[10px] py-1.5 rounded-lg border transition-colors capitalize',
                    ((node.style as any)?.layout ?? 'horizontal') === l
                      ? 'bg-accent/10 border-accent/40 text-accent'
                      : 'bg-canvas border-surface-border text-[var(--text-muted)] hover:border-accent/20',
                  ].join(' ')}
                >
                  {l}
                </button>
              ))}
            </div>
            {/* Label Font Size */}
            <div>
              <label className="text-[9px] text-[var(--text-muted)] uppercase mb-1 block">Label Font Size</label>
              <div className="flex items-center gap-2">
                <input
                  type="range" min={6} max={20}
                  value={(node.style as any)?.labelFontSize ?? 10}
                  onChange={(e) => updateStyle({ labelFontSize: Number(e.target.value) } as any)}
                  className="flex-1 accent-accent h-1 bg-canvas rounded"
                />
                <span className="text-xs text-[var(--text-secondary)] font-mono w-10 text-right">
                  {(node.style as any)?.labelFontSize ?? 10}px
                </span>
              </div>
            </div>
            {/* Value Font Size */}
            <div>
              <label className="text-[9px] text-[var(--text-muted)] uppercase mb-1 block">Value Font Size</label>
              <div className="flex items-center gap-2">
                <input
                  type="range" min={10} max={48}
                  value={(node.style as any)?.valueFontSize ?? 16}
                  onChange={(e) => updateStyle({ valueFontSize: Number(e.target.value) } as any)}
                  className="flex-1 accent-accent h-1 bg-canvas rounded"
                />
                <span className="text-xs text-[var(--text-secondary)] font-mono w-10 text-right">
                  {(node.style as any)?.valueFontSize ?? 16}px
                </span>
              </div>
            </div>
            {/* Show status dot */}
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-[var(--text-secondary)]">Show Status Dot</label>
              <button
                onClick={() => updateStyle({ showStatusDot: !((node.style as any)?.showStatusDot !== false) } as any)}
                className={[
                  'w-9 h-5 rounded-full transition-colors relative',
                  ((node.style as any)?.showStatusDot !== false) ? 'bg-accent' : 'bg-gray-600',
                ].join(' ')}
              >
                <span className={[
                  'absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform',
                  ((node.style as any)?.showStatusDot !== false) ? 'left-[18px]' : 'left-0.5',
                ].join(' ')} />
              </button>
            </div>
            {/* Status border */}
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-[var(--text-secondary)]">Status Border Color</label>
              <button
                onClick={() => updateStyle({ showStatusBorder: !((node.style as any)?.showStatusBorder ?? true) } as any)}
                className={[
                  'w-9 h-5 rounded-full transition-colors relative',
                  ((node.style as any)?.showStatusBorder ?? true) ? 'bg-accent' : 'bg-gray-600',
                ].join(' ')}
              >
                <span className={[
                  'absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform',
                  ((node.style as any)?.showStatusBorder ?? true) ? 'left-[18px]' : 'left-0.5',
                ].join(' ')} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Icon Mode toggle — only for equipment nodes */}
      {showIconSections && (
      <div>
        <SectionTitle>Icon</SectionTitle>
        <div className="flex gap-1 mb-3">
          <button
            onClick={() => updateStyle({ iconMode: 'builtin', customSvg: undefined })}
            className={[
              'flex-1 text-xs py-1.5 rounded-lg border transition-colors',
              iconMode === 'builtin'
                ? 'bg-accent/10 border-accent/40 text-accent'
                : 'bg-canvas border-surface-border text-[var(--text-muted)] hover:border-accent/20',
            ].join(' ')}
          >
            Built-in
          </button>
          <button
            onClick={() => updateStyle({ iconMode: 'custom' })}
            className={[
              'flex-1 text-xs py-1.5 rounded-lg border transition-colors',
              iconMode === 'custom'
                ? 'bg-accent/10 border-accent/40 text-accent'
                : 'bg-canvas border-surface-border text-[var(--text-muted)] hover:border-accent/20',
            ].join(' ')}
          >
            Custom SVG
          </button>
        </div>

        {iconMode === 'builtin' ? (
          /* Icon gallery grid */
          <div className="grid grid-cols-4 gap-1.5">
            {BUILTIN_ICONS.map((icon) => {
              const isActive = node.type === icon.key && iconMode === 'builtin'
              return (
                <button
                  key={icon.key}
                  onClick={() => updateNode(nodeId, { type: icon.key as ScadaNodeType, style: { ...node.style, iconMode: 'builtin', customSvg: undefined } })}
                  className={[
                    'flex flex-col items-center gap-1 p-2 rounded-lg border transition-all group',
                    isActive
                      ? 'border-accent bg-accent/10'
                      : 'border-surface-border hover:border-accent/30 hover:bg-surface',
                  ].join(' ')}
                  title={icon.label}
                >
                  <div
                    className={[
                      'w-7 h-7 transition-colors',
                      isActive ? 'text-accent' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]',
                    ].join(' ')}
                    dangerouslySetInnerHTML={{ __html: icon.svg }}
                  />
                  <span className="text-[8px] text-[var(--text-muted)] leading-none">{icon.label}</span>
                </button>
              )
            })}
          </div>
        ) : (
          /* Custom SVG input */
          <div className="space-y-2">
            <textarea
              className="w-full h-32 bg-canvas border border-surface-border rounded-lg p-2 text-xs font-mono text-[var(--text-secondary)] resize-none focus:outline-none focus:border-accent/40"
              placeholder={'Paste SVG markup here...\n<svg viewBox="0 0 24 24">\n  ...\n</svg>'}
              value={customSvgInput || styleConfig.customSvg || ''}
              onChange={(e) => setCustomSvgInput(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  updateStyle({ customSvg: customSvgInput, iconMode: 'custom' })
                }}
                disabled={!customSvgInput.trim()}
                className="btn-primary text-[10px] h-7 px-3 flex-1"
              >
                Apply SVG
              </button>
              {styleConfig.customSvg && (
                <button
                  onClick={() => {
                    setCustomSvgInput('')
                    updateStyle({ customSvg: undefined, iconMode: 'builtin' })
                  }}
                  className="btn-ghost text-[10px] h-7 px-3"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Preview */}
            {(customSvgInput || styleConfig.customSvg) && (
              <div className="bg-canvas border border-surface-border rounded-lg p-3 flex items-center justify-center">
                <div
                  className="w-12 h-12 text-accent"
                  dangerouslySetInnerHTML={{ __html: customSvgInput || styleConfig.customSvg || '' }}
                />
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* Icon Position */}
      {showIconSections && (
      <div>
        <SectionTitle>Icon Position</SectionTitle>
        <div className="flex gap-1">
          {([
            { key: 'top', label: 'Top', icon: '↑' },
            { key: 'center', label: 'Center', icon: '◎' },
            { key: 'left', label: 'Left', icon: '←' },
            { key: 'right', label: 'Right', icon: '→' },
            { key: 'hidden', label: 'Hidden', icon: '✕' },
          ] as const).map((pos) => (
            <button
              key={pos.key}
              onClick={() => updateStyle({ iconPosition: pos.key })}
              className={[
                'flex-1 text-[10px] py-1.5 rounded-lg border transition-colors flex flex-col items-center gap-0.5',
                (styleConfig.iconPosition ?? 'top') === pos.key
                  ? 'bg-accent/10 border-accent/40 text-accent'
                  : 'bg-canvas border-surface-border text-[var(--text-muted)] hover:border-accent/20',
              ].join(' ')}
              title={pos.label}
            >
              <span className="text-sm leading-none">{pos.icon}</span>
              <span>{pos.label}</span>
            </button>
          ))}
        </div>
      </div>
      )}

      {/* Typography & Sizing */}
      {showIconSections && (
      <div>
        <SectionTitle>Typography &amp; Icon Size</SectionTitle>
        <div className="space-y-3">
          {/* Icon Size */}
          <div>
            <label className="text-[9px] text-[var(--text-muted)] uppercase mb-1 block">Icon / SVG Size</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={12}
                max={80}
                value={styleConfig.iconSize ?? Math.max(20, Math.min(40, Math.min(node.size?.width ?? 100, node.size?.height ?? 100) * 0.35))}
                onChange={(e) => updateStyle({ iconSize: Number(e.target.value) })}
                className="flex-1 accent-accent h-1 bg-canvas rounded"
              />
              <span className="text-xs text-[var(--text-secondary)] font-mono w-10 text-right">
                {styleConfig.iconSize ?? 'auto'}
              </span>
              {styleConfig.iconSize != null && (
                <button
                  onClick={() => updateStyle({ iconSize: undefined })}
                  className="text-[9px] text-accent hover:underline"
                >
                  Auto
                </button>
              )}
            </div>
          </div>

          {/* Label Font Size */}
          <div>
            <label className="text-[9px] text-[var(--text-muted)] uppercase mb-1 block">Label Font Size</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={6}
                max={24}
                value={styleConfig.labelFontSize ?? 10}
                onChange={(e) => updateStyle({ labelFontSize: Number(e.target.value) })}
                className="flex-1 accent-accent h-1 bg-canvas rounded"
              />
              <span className="text-xs text-[var(--text-secondary)] font-mono w-10 text-right">
                {styleConfig.labelFontSize ?? 10}px
              </span>
            </div>
          </div>

          {/* Value Font Size */}
          <div>
            <label className="text-[9px] text-[var(--text-muted)] uppercase mb-1 block">Value Font Size</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={8}
                max={36}
                value={styleConfig.valueFontSize ?? Math.max(10, Math.min(18, Math.min(node.size?.width ?? 100, node.size?.height ?? 100) * 0.14))}
                onChange={(e) => updateStyle({ valueFontSize: Number(e.target.value) })}
                className="flex-1 accent-accent h-1 bg-canvas rounded"
              />
              <span className="text-xs text-[var(--text-secondary)] font-mono w-10 text-right">
                {styleConfig.valueFontSize ?? 'auto'}
              </span>
              {styleConfig.valueFontSize != null && (
                <button
                  onClick={() => updateStyle({ valueFontSize: undefined })}
                  className="text-[9px] text-accent hover:underline"
                >
                  Auto
                </button>
              )}
            </div>
          </div>

          {/* Quick presets */}
          <div className="flex gap-1.5">
            {[
              { label: 'XS', icon: 16, lbl: 8, val: 10 },
              { label: 'S', icon: 24, lbl: 10, val: 12 },
              { label: 'M', icon: 32, lbl: 12, val: 16 },
              { label: 'L', icon: 40, lbl: 14, val: 20 },
              { label: 'XL', icon: 56, lbl: 18, val: 28 },
            ].map((p) => (
              <button
                key={p.label}
                onClick={() => updateStyle({ iconSize: p.icon, labelFontSize: p.lbl, valueFontSize: p.val })}
                className={[
                  'btn-ghost text-[9px] flex-1 py-1 rounded',
                  styleConfig.iconSize === p.icon && styleConfig.labelFontSize === p.lbl ? 'bg-accent/20 text-accent' : '',
                ].join(' ')}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* Colors */}
      <div>
        <SectionTitle>Colors</SectionTitle>
        <div className="space-y-3">
          {/* Accent / Glyph Color */}
          <div>
            <label className="text-[9px] text-[var(--text-muted)] uppercase mb-1 block">Glyph Color</label>
            <div className="flex flex-wrap gap-1.5">
              {/* Default option */}
              <button
                onClick={() => updateStyle({ accentColor: undefined })}
                className={[
                  'w-6 h-6 rounded border-2 transition-all flex items-center justify-center',
                  !styleConfig.accentColor ? 'border-accent scale-110' : 'border-surface-border hover:border-accent/40',
                ].join(' ')}
                title="Default (auto)"
              >
                <span className="text-[7px] text-[var(--text-muted)]">A</span>
              </button>
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  onClick={() => updateStyle({ accentColor: c })}
                  className={[
                    'w-6 h-6 rounded border-2 transition-all',
                    styleConfig.accentColor === c ? 'border-white scale-110' : 'border-transparent hover:border-white/30',
                  ].join(' ')}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Background Color */}
          <div>
            <label className="text-[9px] text-[var(--text-muted)] uppercase mb-1 block">Background</label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => updateStyle({ bgColor: undefined })}
                className={[
                  'w-6 h-6 rounded border-2 transition-all flex items-center justify-center',
                  !styleConfig.bgColor ? 'border-accent scale-110' : 'border-surface-border hover:border-accent/40',
                ].join(' ')}
                title="Default"
              >
                <span className="text-[7px] text-[var(--text-muted)]">D</span>
              </button>
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  onClick={() => updateStyle({ bgColor: c })}
                  className={[
                    'w-6 h-6 rounded border-2 transition-all',
                    styleConfig.bgColor === c ? 'border-white scale-110' : 'border-transparent hover:border-white/30',
                  ].join(' ')}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Border Color */}
          <div>
            <label className="text-[9px] text-[var(--text-muted)] uppercase mb-1 block">Border</label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => updateStyle({ borderColor: undefined })}
                className={[
                  'w-6 h-6 rounded border-2 transition-all flex items-center justify-center',
                  !styleConfig.borderColor ? 'border-accent scale-110' : 'border-surface-border hover:border-accent/40',
                ].join(' ')}
                title="Default"
              >
                <span className="text-[7px] text-[var(--text-muted)]">D</span>
              </button>
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  onClick={() => updateStyle({ borderColor: c })}
                  className={[
                    'w-6 h-6 rounded border-2 transition-all',
                    styleConfig.borderColor === c ? 'border-white scale-110' : 'border-transparent hover:border-white/30',
                  ].join(' ')}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Border */}
      <div>
        <SectionTitle>Border</SectionTitle>

        {/* Show/Hide Border toggle */}
        <div className="flex items-center justify-between mb-3">
          <label className="text-[10px] text-[var(--text-secondary)]">Show Border</label>
          <button
            onClick={() => updateStyle({ showBorder: !(styleConfig.showBorder !== false) })}
            className={[
              'w-9 h-5 rounded-full transition-colors relative',
              (styleConfig.showBorder !== false) ? 'bg-accent' : 'bg-gray-600',
            ].join(' ')}
          >
            <span
              className={[
                'absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform',
                (styleConfig.showBorder !== false) ? 'left-[18px]' : 'left-0.5',
              ].join(' ')}
            />
          </button>
        </div>

        {(styleConfig.showBorder !== false) && (
          <div className="space-y-3">
            {/* Border Width */}
            <div>
              <label className="text-[9px] text-[var(--text-muted)] uppercase mb-1 block">Width</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={6}
                  step={0.5}
                  value={styleConfig.borderWidth ?? 1}
                  onChange={(e) => updateStyle({ borderWidth: Number(e.target.value) })}
                  className="flex-1 accent-accent h-1 bg-canvas rounded"
                />
                <span className="text-xs text-[var(--text-secondary)] font-mono w-10 text-right">
                  {styleConfig.borderWidth ?? 1}px
                </span>
              </div>
            </div>

            {/* Border Radius */}
            <div>
              <label className="text-[9px] text-[var(--text-muted)] uppercase mb-1 block">Radius</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={50}
                  value={styleConfig.borderRadius ?? 12}
                  onChange={(e) => updateStyle({ borderRadius: Number(e.target.value) })}
                  className="flex-1 accent-accent h-1 bg-canvas rounded"
                />
                <span className="text-xs text-[var(--text-secondary)] font-mono w-10 text-right">
                  {styleConfig.borderRadius ?? 12}px
                </span>
              </div>
              {/* Quick radius presets */}
              <div className="flex gap-1.5 mt-1.5">
                {[
                  { label: 'Sharp', v: 0 },
                  { label: 'Soft', v: 8 },
                  { label: 'Round', v: 16 },
                  { label: 'Pill', v: 50 },
                ].map((p) => (
                  <button
                    key={p.label}
                    onClick={() => updateStyle({ borderRadius: p.v })}
                    className={[
                      'btn-ghost text-[9px] px-2 py-0.5 rounded',
                      (styleConfig.borderRadius ?? 12) === p.v ? 'bg-accent/20 text-accent' : '',
                    ].join(' ')}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Opacity */}
      <div>
        <SectionTitle>Opacity</SectionTitle>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0.2}
            max={1}
            step={0.05}
            value={styleConfig.opacity ?? 1}
            onChange={(e) => updateStyle({ opacity: Number(e.target.value) })}
            className="flex-1 accent-accent h-1 bg-canvas rounded"
          />
          <span className="text-xs text-[var(--text-secondary)] font-mono w-10 text-right">
            {Math.round((styleConfig.opacity ?? 1) * 100)}%
          </span>
        </div>
      </div>

      {/* Background Image */}
      <div>
        <SectionTitle>Background Image</SectionTitle>
        <input
          className="scada-input text-xs font-mono mb-2"
          placeholder="Paste image URL (https://...)"
          value={styleConfig.bgImage ?? ''}
          onChange={(e) => updateStyle({ bgImage: e.target.value || undefined })}
        />
        {styleConfig.bgImage && (
          <div className="space-y-2">
            <div className="flex gap-1">
              {(['cover', 'contain', 'fill'] as const).map((fit) => (
                <button
                  key={fit}
                  onClick={() => updateStyle({ bgImageFit: fit })}
                  className={[
                    'flex-1 text-[10px] py-1 rounded-lg border transition-colors capitalize',
                    (styleConfig.bgImageFit ?? 'cover') === fit
                      ? 'bg-accent/10 border-accent/40 text-accent'
                      : 'bg-canvas border-surface-border text-[var(--text-muted)] hover:border-accent/20',
                  ].join(' ')}
                >
                  {fit}
                </button>
              ))}
            </div>
            {/* Image preview */}
            <div className="bg-canvas rounded-lg border border-surface-border p-2 flex items-center justify-center">
              <img
                src={styleConfig.bgImage}
                alt="bg preview"
                className="max-h-16 max-w-full rounded object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            </div>
            <button
              onClick={() => updateStyle({ bgImage: undefined, bgImageFit: undefined })}
              className="btn-ghost text-[10px] h-6 px-2 text-status-alert"
            >
              Remove Image
            </button>
          </div>
        )}
      </div>

      {/* Live Preview */}
      <div>
        <SectionTitle>Preview</SectionTitle>
        <div className="bg-canvas rounded-xl border border-surface-border p-4 flex items-center justify-center">
          <div
            className="relative flex flex-col items-center justify-center overflow-hidden transition-all"
            style={{
              width: Math.min(node.size?.width ?? 100, 120),
              height: Math.min(node.size?.height ?? 100, 120),
              backgroundColor: styleConfig.bgImage ? 'transparent' : (styleConfig.bgColor || 'var(--surface-bg)'),
              borderStyle: 'solid',
              borderWidth: (styleConfig.showBorder !== false) ? (styleConfig.borderWidth ?? 1) : 0,
              borderColor: (styleConfig.showBorder !== false) ? (styleConfig.borderColor || 'var(--surface-border)') : 'transparent',
              borderRadius: styleConfig.borderRadius ?? 12,
              opacity: styleConfig.opacity ?? 1,
              ...(styleConfig.bgImage ? {
                backgroundImage: `url(${styleConfig.bgImage})`,
                backgroundSize: styleConfig.bgImageFit ?? 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              } : {}),
            }}
          >
            {styleConfig.bgImage && (
              <div className="absolute inset-0" style={{ backgroundColor: styleConfig.bgColor || 'rgba(15,23,42,0.55)' }} />
            )}
            {(styleConfig.iconPosition ?? 'top') !== 'hidden' && (
              iconMode === 'custom' && styleConfig.customSvg ? (
                <div
                  className="w-8 h-8 relative z-[1]"
                  style={{ color: styleConfig.accentColor || 'var(--accent)' }}
                  dangerouslySetInnerHTML={{ __html: styleConfig.customSvg }}
                />
              ) : (
                <div
                  className="w-8 h-8 relative z-[1]"
                  style={{ color: styleConfig.accentColor || '#d1d5db' }}
                  dangerouslySetInnerHTML={{
                    __html: BUILTIN_ICONS.find((i) => i.key === node.type)?.svg
                      ?? BUILTIN_ICONS.find((i) => i.key === 'junction')!.svg,
                  }}
                />
              )
            )}
            <span className="text-[8px] text-[var(--text-muted)] mt-1 truncate max-w-[80px] relative z-[1]">
              {node.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// MAIN DRAWER
// ══════════════════════════════════════════════════════════════

export function NodeConfigDrawer() {
  const nodeId = useUiStore((s) => s.configDrawerNodeId)
  const close = useUiStore((s) => s.closeNodeConfig)
  const node = useDiagramStore((s) =>
    nodeId ? s.nodes.find((n) => n.id === nodeId) : null
  )

  const [activeTab, setActiveTab] = useState<ConfigTab>('general')

  // Reset tab when drawer opens for a different node
  useEffect(() => {
    if (nodeId) setActiveTab('general')
  }, [nodeId])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && nodeId) {
        e.stopPropagation()
        close()
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [nodeId, close])

  if (!nodeId || !node) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={close}
      />

      {/* Drawer panel */}
      <div className="fixed right-0 top-0 bottom-0 w-[380px] max-w-[90vw] bg-surface border-l border-surface-border z-50 flex flex-col shadow-2xl panel-slide-in">
        {/* Header */}
        <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent flex-shrink-0">
              <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M8 3a5 5 0 015 5 5 5 0 01-5 5 5 5 0 01-5-5 5 5 0 015-5z" />
                <path d="M8 6v4M6.5 9.5L8 11l1.5-1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[var(--text-primary)] truncate">
                Configure: {node.label}
              </div>
              <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                {node.type} node
              </div>
            </div>
          </div>
          <button
            onClick={close}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex-shrink-0"
            title="Close (Esc)"
          >
            <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 pt-2 flex gap-1 border-b border-surface-border flex-shrink-0">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={[
                'flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-colors -mb-px',
                activeTab === tab.key
                  ? 'border-accent text-accent bg-accent/5'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-surface-hover',
              ].join(' ')}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {activeTab === 'general' && <GeneralTab nodeId={nodeId} />}
          {activeTab === 'bindings' && <BindingsTab nodeId={nodeId} />}
          {activeTab === 'appearance' && <AppearanceTab nodeId={nodeId} />}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-surface-border flex items-center justify-between flex-shrink-0">
          <div className="text-[10px] text-[var(--text-muted)]">
            Changes are applied immediately
          </div>
          <button
            onClick={close}
            className="btn-primary text-xs h-8 px-4"
          >
            Done
          </button>
        </div>
      </div>
    </>
  )
}
