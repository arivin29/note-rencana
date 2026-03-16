// ============================================================
// InspectorPanel — Context-sensitive property panel (kanan)
// Tampil saat node/edge dipilih di edit mode
// ============================================================

import React, { useState } from 'react'
import { useUiStore } from '@/stores/useUiStore'
import { useDiagramStore } from '@/stores/useDiagramStore'
import { useRuntimeStore } from '@/stores/useRuntimeStore'
import type { ScadaNodeDto, ScadaEdgeDto } from '@/types/scada'

// ── Node Inspector ────────────────────────────────────────────

function NodeInspector({ nodeId }: { nodeId: string }) {
  const node    = useDiagramStore((s) => s.nodes.find((n) => n.id === nodeId))
  const update  = useDiagramStore((s) => s.updateNode)
  const runtime = useRuntimeStore((s) => s.nodeRuntimeMap[nodeId] ?? null)

  if (!node) return null

  const [label, setLabel] = useState(node.label)

  const handleLabelBlur = () => {
    if (label !== node.label) update(nodeId, { label })
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-surface-border">
        <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-0.5">
          {node.type} Node
        </div>
        <div className="text-sm font-semibold text-[var(--text-primary)] truncate">{node.label}</div>
      </div>

      <div className="px-3 py-3 flex flex-col gap-4 overflow-y-auto flex-1">
        {/* Basic properties */}
        <section>
          <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
            Properties
          </div>
          <div className="flex flex-col gap-2">
            <div>
              <label className="scada-label">Label</label>
              <input
                className="scada-input"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onBlur={handleLabelBlur}
                placeholder="Node label"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="scada-label">Width</label>
                <input
                  className="scada-input"
                  type="number"
                  value={node.size?.width ?? 100}
                  onChange={(e) => update(nodeId, { size: { ...node.size, width: Number(e.target.value) } })}
                />
              </div>
              <div>
                <label className="scada-label">Height</label>
                <input
                  className="scada-input"
                  type="number"
                  value={node.size?.height ?? 100}
                  onChange={(e) => update(nodeId, { size: { ...node.size, height: Number(e.target.value) } })}
                />
              </div>
            </div>
          </div>
        </section>

        <div className="scada-divider" />

        {/* Runtime values (readonly) */}
        {runtime && (
          <section>
            <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
              Live Values
            </div>
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
          <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
            Bindings ({node.bindings?.length ?? 0})
          </div>
          {(!node.bindings || node.bindings.length === 0) ? (
            <div className="text-xs text-[var(--text-muted)] py-2 text-center">
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
          <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
            Position
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-[var(--text-muted)] font-mono">
            <div>X: {Math.round(node.position?.x ?? 0)}</div>
            <div>Y: {Math.round(node.position?.y ?? 0)}</div>
          </div>
        </section>
      </div>
    </div>
  )
}

// ── Edge Inspector ────────────────────────────────────────────

function EdgeInspector({ edgeId }: { edgeId: string }) {
  const edge   = useDiagramStore((s) => s.edges.find((e) => e.id === edgeId))
  const update = useDiagramStore((s) => s.updateEdge)

  if (!edge) return null

  return (
    <div className="flex flex-col gap-0">
      <div className="px-3 py-2.5 border-b border-surface-border">
        <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-0.5">
          Pipe / Edge
        </div>
        <div className="text-sm font-semibold text-[var(--text-primary)]">
          {edge.label ?? 'Unlabeled pipe'}
        </div>
      </div>

      <div className="px-3 py-3 flex flex-col gap-3">
        <div>
          <label className="scada-label">Label</label>
          <input
            className="scada-input"
            defaultValue={edge.label ?? ''}
            onBlur={(e) => update(edgeId, { label: e.target.value || null })}
            placeholder="Optional label"
          />
        </div>

        <div>
          <label className="scada-label">Pipe Type</label>
          <select
            className="scada-select"
            value={edge.pipeType ?? 'raw'}
            onChange={(e) => update(edgeId, { pipeType: e.target.value as 'raw' | 'treated' })}
          >
            <option value="raw">Raw Water (blue)</option>
            <option value="treated">Treated Water (green)</option>
          </select>
        </div>

        <div>
          <label className="scada-label">Flow Direction</label>
          <select
            className="scada-select"
            value={edge.flowDirection ?? 'forward'}
            onChange={(e) => update(edgeId, { flowDirection: e.target.value as 'forward' | 'reverse' | 'bidirectional' })}
          >
            <option value="forward">Forward →</option>
            <option value="reverse">Reverse ←</option>
            <option value="bidirectional">Bidirectional ↔</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <label className="scada-label mb-0">Animated Flow</label>
          <button
            role="switch"
            aria-checked={edge.animated}
            onClick={() => update(edgeId, { animated: !edge.animated })}
            className={[
              'w-9 h-5 rounded-full border transition-all duration-200 relative',
              edge.animated
                ? 'bg-accent border-accent/50'
                : 'bg-canvas border-surface-border',
            ].join(' ')}
          >
            <span
              className={[
                'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200',
                edge.animated ? 'translate-x-4' : 'translate-x-0.5',
              ].join(' ')}
            />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main InspectorPanel ───────────────────────────────────────

export function InspectorPanel() {
  const mode            = useUiStore((s) => s.mode)
  const inspectorTarget = useUiStore((s) => s.inspectorTarget)
  const selectedNodeIds = useUiStore((s) => s.selectedNodeIds)
  const selectedEdgeIds = useUiStore((s) => s.selectedEdgeIds)

  if (mode !== 'edit') return null
  if (inspectorTarget === 'none') return null

  return (
    <div className="w-64 flex-shrink-0 bg-surface border-l border-surface-border flex flex-col h-full overflow-hidden panel-slide-in">
      <div className="flex-1 overflow-y-auto">
        {inspectorTarget === 'node' && selectedNodeIds[0] && (
          <NodeInspector nodeId={selectedNodeIds[0]} />
        )}
        {inspectorTarget === 'edge' && selectedEdgeIds[0] && (
          <EdgeInspector edgeId={selectedEdgeIds[0]} />
        )}
      </div>
    </div>
  )
}
