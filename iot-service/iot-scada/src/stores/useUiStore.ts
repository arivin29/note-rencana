// ============================================================
// useUiStore — UI State
// Selection, drawer, mode, dan fitView trigger
// ============================================================

import { create } from 'zustand'

export type ScadaMode = 'view' | 'edit'
export type ActiveTool = 'select' | 'add-node' | 'connect'
export type InspectorTarget = 'none' | 'node' | 'edge' | 'diagram'

export interface UiState {
  // Mode
  mode: ScadaMode
  setMode: (mode: ScadaMode) => void

  // Selection
  selectedNodeIds: string[]
  selectedEdgeIds: string[]
  setSelectedNodes: (ids: string[]) => void
  setSelectedEdges: (ids: string[]) => void
  clearSelection: () => void

  // Inspector
  inspectorTarget: InspectorTarget
  setInspectorTarget: (t: InspectorTarget) => void

  // Tool rail
  activeTool: ActiveTool
  setActiveTool: (t: ActiveTool) => void

  // Drawers / panels
  isNodeLibraryOpen: boolean
  setNodeLibraryOpen: (v: boolean) => void

  // FitView trigger (counter yang change = trigger)
  fitViewTrigger: number
  triggerFitView: () => void

  // Dialogs
  discardConfirmOpen: boolean
  setDiscardConfirmOpen: (v: boolean) => void

  // Runtime banner
  runtimeBannerDismissed: boolean
  dismissRuntimeBanner: () => void
  resetRuntimeBanner: () => void
}

export const useUiStore = create<UiState>((set) => ({
  // Mode
  mode: 'view',
  setMode: (mode) => set({ mode, activeTool: 'select' }),

  // Selection
  selectedNodeIds: [],
  selectedEdgeIds: [],
  setSelectedNodes: (ids) => set({
    selectedNodeIds: ids,
    selectedEdgeIds: [],
    inspectorTarget: ids.length > 0 ? 'node' : 'none',
  }),
  setSelectedEdges: (ids) => set({
    selectedEdgeIds: ids,
    selectedNodeIds: [],
    inspectorTarget: ids.length > 0 ? 'edge' : 'none',
  }),
  clearSelection: () => set({
    selectedNodeIds: [],
    selectedEdgeIds: [],
    inspectorTarget: 'none',
  }),

  // Inspector
  inspectorTarget: 'none',
  setInspectorTarget: (t) => set({ inspectorTarget: t }),

  // Tool
  activeTool: 'select',
  setActiveTool: (t) => set({ activeTool: t }),

  // Drawers
  isNodeLibraryOpen: false,
  setNodeLibraryOpen: (v) => set({ isNodeLibraryOpen: v }),

  // FitView
  fitViewTrigger: 0,
  triggerFitView: () => set((s) => ({ fitViewTrigger: s.fitViewTrigger + 1 })),

  // Dialogs
  discardConfirmOpen: false,
  setDiscardConfirmOpen: (v) => set({ discardConfirmOpen: v }),

  // Banner
  runtimeBannerDismissed: false,
  dismissRuntimeBanner: () => set({ runtimeBannerDismissed: true }),
  resetRuntimeBanner: () => set({ runtimeBannerDismissed: false }),
}))
