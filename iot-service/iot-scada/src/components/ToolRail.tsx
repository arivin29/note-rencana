// ============================================================
// ToolRail — Floating vertical tool panel (kiri, hanya edit mode)
// ============================================================

import React from 'react'
import { useUiStore } from '@/stores/useUiStore'
import { useDiagramStore } from '@/stores/useDiagramStore'

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
