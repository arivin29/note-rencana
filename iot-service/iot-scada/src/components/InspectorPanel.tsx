// ============================================================
// InspectorPanel — Enterprise-grade property panel (kanan)
// Draft-state editing with explicit Apply / Close buttons.
// Panel stays open ("pinned") — won't auto-hide on canvas click.
// ============================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useUiStore } from '@/stores/useUiStore'
import { useDiagramStore } from '@/stores/useDiagramStore'
import { useRuntimeStore } from '@/stores/useRuntimeStore'
import type { ScadaEdgeDto, PipeType, PathMode } from '@/types/scada'

// ── Shared: Inspector Header with Close button ────────────────

function InspectorHeader({
  icon,
  typeLabel,
  title,
  onClose,
}: {
  icon: React.ReactNode
  typeLabel: string
  title: string
  onClose: () => void
}) {
  return (
    <div className="px-3 py-2.5 border-b border-surface-border flex items-start justify-between gap-2 flex-shrink-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          {icon}
          <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            {typeLabel}
          </span>
        </div>
        <div className="text-sm font-semibold text-[var(--text-primary)] truncate">{title}</div>
      </div>
      <button
        onClick={onClose}
        className="p-1 rounded hover:bg-surface-hover text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex-shrink-0 mt-0.5"
        title="Close panel (Esc)"
      >
        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

// ── Shared: Action footer buttons ─────────────────────────────

function InspectorFooter({
  hasChanges,
  onApply,
  onReset,
  onClose,
}: {
  hasChanges: boolean
  onApply: () => void
  onReset: () => void
  onClose: () => void
}) {
  return (
    <div className="px-3 py-2.5 border-t border-surface-border flex-shrink-0 bg-surface">
      {hasChanges && (
        <div className="flex items-center gap-1 mb-2 text-[10px] text-accent">
          <svg viewBox="0 0 16 16" className="w-3 h-3 flex-shrink-0" fill="currentColor">
            <circle cx="8" cy="8" r="3" />
          </svg>
          <span>Unsaved changes — click Apply to commit</span>
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={onApply}
          disabled={!hasChanges}
          className="btn-primary text-xs h-8 px-4 flex-1 flex items-center justify-center gap-1.5"
        >
          <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M3 8.5l3.5 3.5L13 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Apply
        </button>
        <button
          onClick={onReset}
          disabled={!hasChanges}
          className="btn-ghost text-xs h-8 px-3 flex items-center gap-1"
          title="Reset to last saved values"
        >
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M2 7a6 6 0 1011.3-3M2 2v5h5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          onClick={onClose}
          className="btn-ghost text-xs h-8 px-3"
          title="Close inspector"
        >
          Close
        </button>
      </div>
    </div>
  )
}

// ── Toggle Switch ─────────────────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
}) {
  return (
    <div className="flex items-center justify-between">
      {label && <label className="scada-label mb-0">{label}</label>}
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          'w-9 h-5 rounded-full border transition-all duration-200 relative flex-shrink-0',
          checked
            ? 'bg-accent border-accent/50'
            : 'bg-canvas border-surface-border',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200',
            checked ? 'translate-x-4' : 'translate-x-0.5',
          ].join(' ')}
        />
      </button>
    </div>
  )
}

// ── Section Header ────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
      {children}
    </div>
  )
}

// ── Node Inspector ────────────────────────────────────────────

interface NodeDraft {
  label: string
  width: number
  height: number
}

function NodeInspector({ nodeId, onClose }: { nodeId: string; onClose: () => void }) {
  const node    = useDiagramStore((s) => s.nodes.find((n) => n.id === nodeId))
  const update  = useDiagramStore((s) => s.updateNode)
  const runtime = useRuntimeStore((s) => s.nodeRuntimeMap[nodeId] ?? null)

  // Draft state — local copy of editable fields
  const [draft, setDraft] = useState<NodeDraft>({
    label:  node?.label ?? '',
    width:  node?.size?.width ?? 100,
    height: node?.size?.height ?? 100,
  })

  // Re-sync draft when a different node is selected
  useEffect(() => {
    if (node) {
      setDraft({
        label:  node.label,
        width:  node.size?.width ?? 100,
        height: node.size?.height ?? 100,
      })
    }
  }, [nodeId]) // eslint-disable-line react-hooks/exhaustive-deps

  const hasChanges = useMemo(() => {
    if (!node) return false
    return (
      draft.label !== node.label ||
      draft.width !== (node.size?.width ?? 100) ||
      draft.height !== (node.size?.height ?? 100)
    )
  }, [draft, node])

  const handleApply = useCallback(() => {
    if (!node) return
    update(nodeId, {
      label: draft.label,
      size: { width: draft.width, height: draft.height },
    })
  }, [draft, nodeId, node, update])

  const handleReset = useCallback(() => {
    if (!node) return
    setDraft({
      label: node.label,
      width: node.size?.width ?? 100,
      height: node.size?.height ?? 100,
    })
  }, [node])

  if (!node) return null

  return (
    <div className="flex flex-col h-full">
      <InspectorHeader
        icon={
          <svg viewBox="0 0 16 16" className="w-3 h-3 text-accent" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <rect x="3" y="3" width="10" height="10" rx="2" />
          </svg>
        }
        typeLabel={`${node.type} node`}
        title={node.label}
        onClose={onClose}
      />

      <div className="px-3 py-3 flex flex-col gap-4 overflow-y-auto flex-1">
        {/* Basic properties */}
        <section>
          <SectionTitle>Properties</SectionTitle>
          <div className="flex flex-col gap-2">
            <div>
              <label className="scada-label">Label</label>
              <input
                className="scada-input"
                value={draft.label}
                onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
                placeholder="Node label"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="scada-label">Width</label>
                <input
                  className="scada-input"
                  type="number"
                  value={draft.width}
                  onChange={(e) => setDraft((d) => ({ ...d, width: Number(e.target.value) || 100 }))}
                />
              </div>
              <div>
                <label className="scada-label">Height</label>
                <input
                  className="scada-input"
                  type="number"
                  value={draft.height}
                  onChange={(e) => setDraft((d) => ({ ...d, height: Number(e.target.value) || 100 }))}
                />
              </div>
            </div>
          </div>
        </section>

        <div className="scada-divider" />

        {/* Runtime values (readonly) */}
        {runtime && runtime.allBindings.length > 0 && (
          <section>
            <SectionTitle>Live Values</SectionTitle>
            <div className="flex flex-col gap-1">
              {runtime.allBindings.map((b) => (
                <div key={b.bindingId} className="flex items-center justify-between py-1 border-b border-surface-border/50">
                  <span className="text-xs text-[var(--text-secondary)]">
                    {b.displayLabel ?? b.bindingKey}
                  </span>
                  <span className="value-display text-xs text-[var(--text-primary)]">
                    {b.value != null ? b.value.toFixed(b.precision ?? 1) : '—'}
                    {b.unitOverride ?? b.unit ? (
                      <span className="text-[var(--text-muted)] ml-0.5">
                        {b.unitOverride ?? b.unit}
                      </span>
                    ) : null}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Bindings */}
        <section>
          <SectionTitle>Bindings ({node.bindings?.length ?? 0})</SectionTitle>
          {(!node.bindings || node.bindings.length === 0) ? (
            <div className="text-xs text-[var(--text-muted)] py-2 text-center border border-dashed border-surface-border rounded-lg">
              No bindings configured
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {node.bindings.map((b, i) => (
                <div key={b.id ?? i} className="bg-canvas rounded-lg p-2 border border-surface-border text-xs">
                  <div className="flex items-center gap-1 mb-0.5">
                    {b.isPrimary && (
                      <span className="text-[9px] bg-accent/20 text-accent px-1 rounded font-semibold">PRIMARY</span>
                    )}
                    <span className="font-mono text-[var(--text-secondary)]">{b.bindingKey}</span>
                  </div>
                  <div className="text-[var(--text-muted)] font-mono truncate text-[10px]">
                    {b.displayLabel ?? 'Channel: ' + b.sensorChannelId.slice(0, 8) + '...'}
                  </div>
                  {b.unitOverride && (
                    <div className="text-[10px] text-accent">Unit: {b.unitOverride}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Position info */}
        <section>
          <SectionTitle>Position</SectionTitle>
          <div className="grid grid-cols-2 gap-2 text-xs text-[var(--text-muted)] font-mono">
            <div>X: {Math.round(node.position?.x ?? 0)}</div>
            <div>Y: {Math.round(node.position?.y ?? 0)}</div>
          </div>
        </section>
      </div>

      <InspectorFooter
        hasChanges={hasChanges}
        onApply={handleApply}
        onReset={handleReset}
        onClose={onClose}
      />
    </div>
  )
}

// ── Edge Inspector ────────────────────────────────────────────

const PIPE_COLORS: Record<string, string> = {
  raw: '#3b82f6', treated: '#22c55e', waste: '#a855f7',
  chemical: '#f59e0b', electrical: '#ef4444', generic: '#6b7280',
}

interface EdgeDraft {
  label: string
  pipeType: PipeType
  pathMode: PathMode
  flowDirection: 'forward' | 'reverse' | 'bidirectional'
  strokeWidth: number
  animated: boolean
}

function edgeToDraft(edge: ScadaEdgeDto): EdgeDraft {
  return {
    label:         edge.label ?? '',
    pipeType:      (edge.pipeType ?? 'raw') as PipeType,
    pathMode:      (edge.pathMode ?? 'smoothstep') as PathMode,
    flowDirection: (edge.flowDirection ?? 'forward') as EdgeDraft['flowDirection'],
    strokeWidth:   edge.strokeWidth ?? 2,
    animated:      edge.animated ?? false,
  }
}

function EdgeInspector({ edgeId, onClose }: { edgeId: string; onClose: () => void }) {
  const edge   = useDiagramStore((s) => s.edges.find((e) => e.id === edgeId))
  const update = useDiagramStore((s) => s.updateEdge)

  const [draft, setDraft] = useState<EdgeDraft>(() => edge ? edgeToDraft(edge) : {
    label: '', pipeType: 'raw', pathMode: 'smoothstep',
    flowDirection: 'forward', strokeWidth: 2, animated: false,
  })

  // Re-sync when a different edge is selected
  useEffect(() => {
    if (edge) setDraft(edgeToDraft(edge))
  }, [edgeId]) // eslint-disable-line react-hooks/exhaustive-deps

  const hasChanges = useMemo(() => {
    if (!edge) return false
    const original = edgeToDraft(edge)
    return (
      draft.label !== original.label ||
      draft.pipeType !== original.pipeType ||
      draft.pathMode !== original.pathMode ||
      draft.flowDirection !== original.flowDirection ||
      draft.strokeWidth !== original.strokeWidth ||
      draft.animated !== original.animated
    )
  }, [draft, edge])

  const handleApply = useCallback(() => {
    update(edgeId, {
      label:         draft.label || null,
      pipeType:      draft.pipeType,
      pathMode:      draft.pathMode,
      flowDirection: draft.flowDirection,
      strokeWidth:   draft.strokeWidth,
      animated:      draft.animated,
    })
  }, [draft, edgeId, update])

  const handleReset = useCallback(() => {
    if (edge) setDraft(edgeToDraft(edge))
  }, [edge])

  if (!edge) return null

  const previewColor = PIPE_COLORS[draft.pipeType] ?? PIPE_COLORS.generic

  return (
    <div className="flex flex-col h-full">
      <InspectorHeader
        icon={
          <svg viewBox="0 0 16 16" className="w-3 h-3 text-accent" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M3 13 L13 3" strokeLinecap="round" />
          </svg>
        }
        typeLabel="Pipe / Edge"
        title={edge.label ?? 'Unlabeled pipe'}
        onClose={onClose}
      />

      <div className="px-3 py-3 flex flex-col gap-3 overflow-y-auto flex-1">
        {/* Label */}
        <div>
          <label className="scada-label">Label</label>
          <input
            className="scada-input"
            value={draft.label}
            onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
            placeholder="Optional label"
          />
        </div>

        {/* Pipe Type */}
        <div>
          <label className="scada-label">Pipe Type</label>
          <select
            className="scada-select"
            value={draft.pipeType}
            onChange={(e) => setDraft((d) => ({ ...d, pipeType: e.target.value as PipeType }))}
          >
            <option value="raw">💧 Raw Water (blue)</option>
            <option value="treated">💚 Treated Water (green)</option>
            <option value="waste">🟣 Waste Water (purple)</option>
            <option value="chemical">🟡 Chemical (amber)</option>
            <option value="electrical">🔴 Electrical (red)</option>
            <option value="generic">⚪ Generic (gray)</option>
          </select>
        </div>

        {/* Path Mode */}
        <div>
          <label className="scada-label">Path Mode</label>
          <select
            className="scada-select"
            value={draft.pathMode}
            onChange={(e) => setDraft((d) => ({ ...d, pathMode: e.target.value as PathMode }))}
          >
            <option value="smoothstep">Smooth Step (rounded corners)</option>
            <option value="bezier">Bezier Curve (S-curve)</option>
            <option value="straight">Straight Line</option>
            <option value="step">Step (orthogonal, sharp)</option>
          </select>
        </div>

        {/* Flow Direction */}
        <div>
          <label className="scada-label">Flow Direction</label>
          <select
            className="scada-select"
            value={draft.flowDirection}
            onChange={(e) => setDraft((d) => ({ ...d, flowDirection: e.target.value as EdgeDraft['flowDirection'] }))}
          >
            <option value="forward">Forward →</option>
            <option value="reverse">Reverse ←</option>
            <option value="bidirectional">Bidirectional ↔</option>
          </select>
        </div>

        {/* Stroke Width */}
        <div>
          <label className="scada-label">Stroke Width</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={1}
              max={8}
              step={0.5}
              value={draft.strokeWidth}
              onChange={(e) => setDraft((d) => ({ ...d, strokeWidth: Number(e.target.value) }))}
              className="flex-1 accent-accent h-1 bg-canvas rounded"
            />
            <span className="text-xs text-[var(--text-secondary)] font-mono w-8 text-right">
              {draft.strokeWidth}px
            </span>
          </div>
        </div>

        {/* Animated Flow */}
        <ToggleSwitch
          label="Animated Flow"
          checked={draft.animated}
          onChange={(v) => setDraft((d) => ({ ...d, animated: v }))}
        />

        {/* Live Preview */}
        <div className="scada-divider" />
        <section>
          <SectionTitle>Preview</SectionTitle>
          <div className="bg-canvas rounded-lg p-3 border border-surface-border flex items-center justify-center">
            <svg width="100%" height="28" viewBox="0 0 200 28" className="overflow-visible">
              {draft.pathMode === 'smoothstep' ? (
                <path
                  d="M10 22 H80 Q95 22 95 14 V14 Q95 6 110 6 H190"
                  fill="none"
                  stroke={previewColor}
                  strokeWidth={draft.strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={draft.animated ? '8 4' : undefined}
                >
                  {draft.animated && (
                    <animate attributeName="stroke-dashoffset" from="24" to="0" dur="1.2s" repeatCount="indefinite" />
                  )}
                </path>
              ) : draft.pathMode === 'step' ? (
                <path
                  d="M10 22 H95 V6 H190"
                  fill="none"
                  stroke={previewColor}
                  strokeWidth={draft.strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={draft.animated ? '8 4' : undefined}
                >
                  {draft.animated && (
                    <animate attributeName="stroke-dashoffset" from="24" to="0" dur="1.2s" repeatCount="indefinite" />
                  )}
                </path>
              ) : draft.pathMode === 'bezier' ? (
                <path
                  d="M10 22 C60 22 140 6 190 6"
                  fill="none"
                  stroke={previewColor}
                  strokeWidth={draft.strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={draft.animated ? '8 4' : undefined}
                >
                  {draft.animated && (
                    <animate attributeName="stroke-dashoffset" from="24" to="0" dur="1.2s" repeatCount="indefinite" />
                  )}
                </path>
              ) : (
                <line
                  x1="10" y1="14" x2="190" y2="14"
                  stroke={previewColor}
                  strokeWidth={draft.strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={draft.animated ? '8 4' : undefined}
                >
                  {draft.animated && (
                    <animate attributeName="stroke-dashoffset" from="24" to="0" dur="1.2s" repeatCount="indefinite" />
                  )}
                </line>
              )}
              {/* Endpoints */}
              <circle cx="10" cy={draft.pathMode === 'straight' ? 14 : 22} r="3" fill={previewColor} opacity={0.5} />
              <circle cx="190" cy={draft.pathMode === 'straight' ? 14 : 6} r="3" fill={previewColor} opacity={0.5} />
            </svg>
          </div>
        </section>

        {/* Edge connection info */}
        <div className="scada-divider" />
        <section>
          <SectionTitle>Connection</SectionTitle>
          <div className="grid grid-cols-1 gap-1.5 text-[10px] text-[var(--text-muted)] font-mono">
            <div className="flex items-center gap-1">
              <span className="text-[var(--text-secondary)]">Source:</span>
              <span className="truncate">{edge.source.slice(0, 12)}…</span>
              {edge.sourceHandle && <span className="text-accent">:{edge.sourceHandle}</span>}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[var(--text-secondary)]">Target:</span>
              <span className="truncate">{edge.target.slice(0, 12)}…</span>
              {edge.targetHandle && <span className="text-accent">:{edge.targetHandle}</span>}
            </div>
          </div>
        </section>
      </div>

      <InspectorFooter
        hasChanges={hasChanges}
        onApply={handleApply}
        onReset={handleReset}
        onClose={onClose}
      />
    </div>
  )
}

// ── Main InspectorPanel ───────────────────────────────────────

export function InspectorPanel() {
  // Disabled — node/edge configuration is now handled by NodeConfigDrawer (gear icon).
  // Keeping the component for potential future use (e.g. quick-property sidebar).
  return null

  /* Original logic preserved for reference:
  const mode            = useUiStore((s) => s.mode)
  const inspectorTarget = useUiStore((s) => s.inspectorTarget)
  const selectedNodeIds = useUiStore((s) => s.selectedNodeIds)
  const selectedEdgeIds = useUiStore((s) => s.selectedEdgeIds)
  const closeInspector  = useUiStore((s) => s.closeInspector)

  if (mode !== 'edit') return null
  if (inspectorTarget === 'none') return null

  return (
    <div className="w-72 flex-shrink-0 bg-surface border-l border-surface-border flex flex-col h-full overflow-hidden panel-slide-in">
      {inspectorTarget === 'node' && selectedNodeIds[0] && (
        <NodeInspector nodeId={selectedNodeIds[0]} onClose={closeInspector} />
      )}
      {inspectorTarget === 'edge' && selectedEdgeIds[0] && (
        <EdgeInspector edgeId={selectedEdgeIds[0]} onClose={closeInspector} />
      )}
    </div>
  )
  */
}
