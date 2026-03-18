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
  inspectorPinned: boolean
  setInspectorPinned: (v: boolean) => void
  closeInspector: () => void

  // Tool rail
  activeTool: ActiveTool
  setActiveTool: (t: ActiveTool) => void

  // Drawers / panels
  isNodeLibraryOpen: boolean
  setNodeLibraryOpen: (v: boolean) => void

  // Node config drawer (full config slide-over)
  configDrawerNodeId: string | null
  openNodeConfig: (nodeId: string) => void
  closeNodeConfig: () => void

  // Edge config drawer
  configDrawerEdgeId: string | null
  openEdgeConfig: (edgeId: string) => void
  closeEdgeConfig: () => void

  // View-mode tooltip — only ONE node tooltip visible at a time
  activeTooltipNodeId: string | null
  setActiveTooltipNodeId: (id: string | null) => void
  toggleTooltipNodeId: (id: string) => void

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

  // Diagram settings panel
  diagramSettingsOpen: boolean
  setDiagramSettingsOpen: (v: boolean) => void

  // Fullscreen
  isFullscreen: boolean
  setFullscreen: (v: boolean) => void
  toggleFullscreen: () => void

  // Lock pan (view mode)
  isPanLocked: boolean
  togglePanLock: () => void
}

export const useUiStore = create<UiState>((set) => ({
  // Mode
  mode: 'view',
  setMode: (mode) => set({ mode, activeTool: 'select' }),

  // Selection
  selectedNodeIds: [],
  selectedEdgeIds: [],
  setSelectedNodes: (ids) => set((s) => {
    // If inspector is pinned (user editing), don't close it on deselection
    if (ids.length > 0) {
      return {
        selectedNodeIds: ids,
        selectedEdgeIds: [],
        inspectorTarget: 'node',
        inspectorPinned: true,
      }
    }
    // Deselecting — only close inspector if NOT pinned
    if (s.inspectorPinned) {
      return { selectedNodeIds: ids, selectedEdgeIds: [] }
    }
    return {
      selectedNodeIds: ids,
      selectedEdgeIds: [],
      inspectorTarget: 'none',
    }
  }),
  setSelectedEdges: (ids) => set((s) => {
    if (ids.length > 0) {
      return {
        selectedEdgeIds: ids,
        selectedNodeIds: [],
        inspectorTarget: 'edge',
        inspectorPinned: true,
      }
    }
    if (s.inspectorPinned) {
      return { selectedEdgeIds: ids, selectedNodeIds: [] }
    }
    return {
      selectedEdgeIds: ids,
      selectedNodeIds: [],
      inspectorTarget: 'none',
    }
  }),
  clearSelection: () => set((s) => {
    if (s.inspectorPinned) {
      return { selectedNodeIds: [], selectedEdgeIds: [] }
    }
    return {
      selectedNodeIds: [],
      selectedEdgeIds: [],
      inspectorTarget: 'none',
    }
  }),

  // Inspector
  inspectorTarget: 'none',
  setInspectorTarget: (t) => set({ inspectorTarget: t }),
  inspectorPinned: false,
  setInspectorPinned: (v) => set({ inspectorPinned: v }),
  closeInspector: () => set({
    inspectorTarget: 'none',
    inspectorPinned: false,
    selectedNodeIds: [],
    selectedEdgeIds: [],
  }),

  // Tool
  activeTool: 'select',
  setActiveTool: (t) => set({ activeTool: t }),

  // Drawers
  isNodeLibraryOpen: false,
  setNodeLibraryOpen: (v) => set({ isNodeLibraryOpen: v }),

  // Node config drawer
  configDrawerNodeId: null,
  openNodeConfig: (nodeId) => set({ configDrawerNodeId: nodeId }),
  closeNodeConfig: () => set({ configDrawerNodeId: null }),

  // Edge config drawer
  configDrawerEdgeId: null,
  openEdgeConfig: (edgeId) => set({ configDrawerEdgeId: edgeId }),
  closeEdgeConfig: () => set({ configDrawerEdgeId: null }),

  // View-mode tooltip — single active
  activeTooltipNodeId: null,
  setActiveTooltipNodeId: (id) => set({ activeTooltipNodeId: id }),
  toggleTooltipNodeId: (id) => set((s) => ({
    activeTooltipNodeId: s.activeTooltipNodeId === id ? null : id,
  })),

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

  // Diagram settings
  diagramSettingsOpen: false,
  setDiagramSettingsOpen: (v) => set({ diagramSettingsOpen: v }),

  // Fullscreen
  isFullscreen: false,
  setFullscreen: (v) => set({ isFullscreen: v }),
  toggleFullscreen: () => set((s) => ({ isFullscreen: !s.isFullscreen })),

  // Lock pan
  isPanLocked: false,
  togglePanLock: () => set((s) => ({ isPanLocked: !s.isPanLocked })),
}))
