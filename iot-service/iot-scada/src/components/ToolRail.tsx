// ============================================================
// ToolRail — Floating vertical tool panel (kiri, hanya edit mode)
// ============================================================

import React from 'react'
import { useUiStore } from '@/stores/useUiStore'
import { useDiagramStore } from '@/stores/useDiagramStore'
import { NODE_LIBRARY } from '@/nodes/registry'

export function ToolRail() {
  const mode             = useUiStore((s) => s.mode)
  const activeTool       = useUiStore((s) => s.activeTool)
  const setActiveTool    = useUiStore((s) => s.setActiveTool)
  const setNodeLibraryOpen= useUiStore((s) => s.setNodeLibraryOpen)
  const triggerFitView   = useUiStore((s) => s.triggerFitView)
  const selectedNodeIds  = useUiStore((s) => s.selectedNodeIds)
  const selectedEdgeIds  = useUiStore((s) => s.selectedEdgeIds)

  const removeNode = useDiagramStore((s) => s.removeNode)
  const removeEdge = useDiagramStore((s) => s.removeEdge)

  if (mode !== 'edit') return null

  const hasSelection = selectedNodeIds.length > 0 || selectedEdgeIds.length > 0

  const handleDelete = () => {
    selectedNodeIds.forEach((id) => removeNode(id))
    selectedEdgeIds.forEach((id) => removeEdge(id))
  }

  return (
    <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-1.5 panel-slide-in">
      <div className="flex flex-col gap-1 bg-surface border border-surface-border rounded-xl p-1.5 shadow-panel">
        {/* Select tool */}
        <button
          onClick={() => setActiveTool('select')}
          className={`tool-btn ${activeTool === 'select' ? 'active' : ''}`}
          title="Select (V)"
        >
          <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor">
            <path d="M4 2l12 8-6 1-3 7L4 2z" />
          </svg>
        </button>

        {/* Add node */}
        <button
          onClick={() => {
            setActiveTool('add-node')
            setNodeLibraryOpen(true)
          }}
          className={`tool-btn ${activeTool === 'add-node' ? 'active' : ''}`}
          title="Add Component (A)"
        >
          <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <circle cx="10" cy="10" r="7" />
            <path d="M10 7v6M7 10h6" strokeLinecap="round" />
          </svg>
        </button>

        {/* Divider */}
        <div className="scada-divider my-0" />

        {/* Fit view */}
        <button
          onClick={triggerFitView}
          className="tool-btn"
          title="Fit View (Shift+F)"
        >
          <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M3 8V3h5M17 8V3h-5M3 12v5h5M17 12v5h-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Delete selection */}
        <button
          onClick={handleDelete}
          disabled={!hasSelection}
          className={`tool-btn ${hasSelection ? 'hover:text-status-alert hover:bg-red-500/10' : 'opacity-30 cursor-not-allowed'}`}
          title="Delete Selected (Del)"
        >
          <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M7 4h6M5 7h10l-1 10H6L5 7z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Node count badge */}
      {hasSelection && (
        <div className="flex justify-center">
          <span className="text-[10px] text-[var(--text-muted)] bg-canvas/80 px-2 py-0.5 rounded-full border border-surface-border">
            {selectedNodeIds.length + selectedEdgeIds.length} selected
          </span>
        </div>
      )}
    </div>
  )
}

// ── Node Library Drawer ───────────────────────────────────────

interface NodeLibraryDrawerProps {
  onAddNode: (type: string, label: string, size: { width: number; height: number }) => void
}

export function NodeLibraryDrawer({ onAddNode }: NodeLibraryDrawerProps) {
  const isOpen = useUiStore((s) => s.isNodeLibraryOpen)
  const setOpen = useUiStore((s) => s.setNodeLibraryOpen)
  const setActiveTool = useUiStore((s) => s.setActiveTool)

  if (!isOpen) return null

  return (
    <div className="absolute left-16 top-1/2 -translate-y-1/2 z-20 panel-slide-in">
      <div className="w-56 bg-surface border border-surface-border rounded-xl shadow-panel overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-surface-border">
          <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            Components
          </span>
          <button
            onClick={() => { setOpen(false); setActiveTool('select') }}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-surface-hover text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Node list */}
        <div className="p-2 flex flex-col gap-1">
          {NODE_LIBRARY.map((item) => (
            <button
              key={item.type}
              onClick={() => {
                onAddNode(item.type, item.label, item.defaultSize)
                setOpen(false)
                setActiveTool('select')
              }}
              className="flex items-start gap-2.5 px-2.5 py-2 rounded-lg hover:bg-surface-hover text-left w-full transition-colors duration-100 group"
            >
              <div className="w-7 h-7 rounded-md bg-canvas border border-surface-border flex items-center justify-center flex-shrink-0 group-hover:border-accent/30 transition-colors">
                <span className="text-[var(--text-muted)] text-[9px] font-mono font-bold uppercase">
                  {item.type.slice(0, 2)}
                </span>
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-[var(--text-primary)]">{item.label}</div>
                <div className="text-[11px] text-[var(--text-muted)] leading-tight">{item.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
