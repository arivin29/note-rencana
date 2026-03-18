// ============================================================
// DiagramPage — Engine utama view+edit
// Route: /diagrams/:diagramId/view  dan  /diagrams/:diagramId/edit
// ============================================================

import React, { useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ReactFlowProvider } from '@xyflow/react'

import { ScadaCanvas }     from '@/canvas/ScadaCanvas'
import { TopBar }          from '@/components/TopBar'
import { ToolRail } from '@/components/ToolRail'
import { NodeLibraryDrawer } from '@/components/NodeLibraryDrawer'
import { InspectorPanel }  from '@/components/InspectorPanel'
import { NodeConfigDrawer } from '@/components/NodeConfigDrawer'
import { EdgeConfigDrawer } from '@/components/EdgeConfigDrawer'
import { RuntimeBanner }   from '@/components/RuntimeBanner'
import { ToastContainer }  from '@/components/Toast'
import { DiagramSettingsPanel } from '@/components/DiagramSettingsPanel'

import { useScadaDiagram } from '@/hooks/useScadaDiagram'
import { useRuntimePolling } from '@/hooks/useRuntimePolling'
import { useTrendPolling } from '@/stores/useTrendStore'

import { useDiagramStore } from '@/stores/useDiagramStore'
import { useUiStore }      from '@/stores/useUiStore'

import type { ScadaNodeDto } from '@/types/scada'
import { NODE_LIBRARY } from '@/components/NodeLibraryDrawer'

interface DiagramPageProps {
  initialMode?: 'view' | 'edit'
}

export function DiagramPage({ initialMode = 'view' }: DiagramPageProps) {
  const { diagramId }  = useParams<{ diagramId: string }>()
  const navigate        = useNavigate()

  const { meta, isLoading, loadError, isSaving, save } = useScadaDiagram(diagramId)

  // Runtime polling — aktif di kedua mode
  useRuntimePolling(diagramId, Boolean(diagramId))

  // Trend history polling — aktif di kedua mode, slower cadence
  useTrendPolling(Boolean(diagramId))

  // Set initial mode from route
  const setMode      = useUiStore((s) => s.setMode)
  const mode         = useUiStore((s) => s.mode)
  const discardConfirmOpen  = useUiStore((s) => s.discardConfirmOpen)
  const setDiscardConfirmOpen = useUiStore((s) => s.setDiscardConfirmOpen)
  const isDirty      = useDiagramStore((s) => s.isDirty)
  const resetToSaved = useDiagramStore((s) => s.resetToSaved)
  const addNode      = useDiagramStore((s) => s.addNode)

  useEffect(() => {
    setMode(initialMode)
  }, [initialMode, setMode])

  // Warn before page unload if dirty
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S → save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (mode === 'edit') save()
      }
      // Shift + F → fit view
      if (e.shiftKey && e.key === 'F') {
        useUiStore.getState().triggerFitView()
      }
      // Delete / Backspace → remove selected (handled by React Flow onDelete,
      // but also handle here for ToolRail-based deletion)
      if ((e.key === 'Delete' || e.key === 'Backspace') && mode === 'edit') {
        // Only if focus is NOT in an input/textarea
        const tag = (e.target as HTMLElement)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        const { selectedNodeIds, selectedEdgeIds } = useUiStore.getState()
        const { removeNode, removeEdge } = useDiagramStore.getState()
        selectedEdgeIds.forEach((id) => removeEdge(id))
        selectedNodeIds.forEach((id) => removeNode(id))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [mode, save])

  // Add node handler
  const handleAddNode = useCallback((type: string, label: string, size: { width: number; height: number }) => {
    const newNode: ScadaNodeDto = {
      id:       crypto.randomUUID(),
      type:     type as ScadaNodeDto['type'],
      label,
      position: { x: 300 + Math.random() * 100, y: 200 + Math.random() * 100 },
      size,
      zIndex:   0,
      bindings: [],
      style:    {},
      config:   {},
    }
    addNode(newNode)
  }, [addNode])

  // ── Loading state ─────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="h-full w-full bg-canvas flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[var(--text-secondary)]">Loading diagram...</p>
          <p className="text-xs text-[var(--text-muted)] mt-1 font-mono">{diagramId?.slice(0, 8)}...</p>
        </div>
      </div>
    )
  }

  // ── Load error ────────────────────────────────────────────────
  if (loadError) {
    return (
      <div className="h-full w-full bg-canvas flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-status-alert" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-base font-semibold text-[var(--text-primary)] mb-1">Failed to load diagram</p>
          <p className="text-sm text-[var(--text-secondary)] mb-4">{loadError}</p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => navigate('/')} className="btn-ghost">← Back</button>
            <button onClick={() => window.location.reload()} className="btn-primary">Retry</button>
          </div>
        </div>
      </div>
    )
  }

  // ── Main diagram view ─────────────────────────────────────────
  return (
    <div className="h-full w-full flex flex-col bg-canvas overflow-hidden">
      {/* Top bar */}
      <TopBar onSave={save} />

      {/* Runtime degraded/offline banner */}
      <RuntimeBanner />

      {/* Diagram settings popover (edit mode, from TopBar name click) */}
      <DiagramSettingsPanel />

      {/* Main area */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Canvas (fullscreen) */}
        <ReactFlowProvider>
          <ScadaCanvas />

          {/* Tool rail — overlay kiri */}
          <ToolRail />

          {/* Node library drawer — overlay kiri tengah */}
          <NodeLibraryDrawer onAddNode={handleAddNode} />
        </ReactFlowProvider>

        {/* Inspector panel — kanan */}
        <InspectorPanel />
      </div>

      {/* Node config drawer — full-screen overlay */}
      <NodeConfigDrawer />
      <EdgeConfigDrawer />

      {/* Empty state overlay */}
      {!isLoading && !loadError && meta && (useDiagramStore.getState().nodes.length === 0) && mode === 'edit' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="text-center opacity-60">
            <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-surface-border flex items-center justify-center mx-auto mb-3">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-[var(--text-muted)]" fill="none" stroke="currentColor" strokeWidth={1}>
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-sm text-[var(--text-muted)]">Canvas kosong</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Klik tombol + untuk menambahkan komponen</p>
          </div>
        </div>
      )}

      {/* Discard confirm dialog */}
      {discardConfirmOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface border border-surface-border rounded-2xl p-6 w-full max-w-sm shadow-panel">
            <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">Unsaved changes</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-5">
              Diagram has unsaved changes. What would you like to do?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDiscardConfirmOpen(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  resetToSaved()
                  setMode('view')
                  setDiscardConfirmOpen(false)
                }}
                className="btn-danger"
              >
                Discard
              </button>
              <button
                onClick={async () => {
                  await save()
                  setMode('view')
                  setDiscardConfirmOpen(false)
                }}
                disabled={isSaving}
                className="btn-primary"
              >
                Save & Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notifications (portal to body) */}
      <ToastContainer />
    </div>
  )
}
