// ============================================================
// useDiagramStore — Diagram Persisted State
// Menyimpan saved snapshot, working snapshot, dan dirty state
// ============================================================

import { create } from 'zustand'
import type {
  ScadaDiagramMeta,
  ScadaNodeDto,
  ScadaEdgeDto,
} from '@/types/scada'

export interface DiagramState {
  // Metadata & snapshot
  meta: ScadaDiagramMeta | null
  nodes: ScadaNodeDto[]
  edges: ScadaEdgeDto[]

  // Saved snapshot (last persisted to server)
  savedNodes: ScadaNodeDto[]
  savedEdges: ScadaEdgeDto[]

  // State flags
  isDirty: boolean
  isLoading: boolean
  isSaving: boolean
  loadError: string | null
  saveError: string | null

  // Actions — Load
  setLoading: (v: boolean) => void
  setLoadError: (err: string | null) => void
  loadDiagram: (meta: ScadaDiagramMeta, nodes: ScadaNodeDto[], edges: ScadaEdgeDto[]) => void

  // Actions — Save
  setSaving: (v: boolean) => void
  setSaveError: (err: string | null) => void
  commitSave: (meta: ScadaDiagramMeta, nodes: ScadaNodeDto[], edges: ScadaEdgeDto[]) => void

  // Actions — Node
  setNodes: (nodes: ScadaNodeDto[]) => void
  addNode: (node: ScadaNodeDto) => void
  updateNode: (id: string, patch: Partial<ScadaNodeDto>) => void
  removeNode: (id: string) => void

  // Actions — Edge
  setEdges: (edges: ScadaEdgeDto[]) => void
  addEdge: (edge: ScadaEdgeDto) => void
  updateEdge: (id: string, patch: Partial<ScadaEdgeDto>) => void
  removeEdge: (id: string) => void

  // Actions — Dirty
  resetToSaved: () => void
  clearDiagram: () => void
}

export const useDiagramStore = create<DiagramState>((set, get) => ({
  meta: null,
  nodes: [],
  edges: [],
  savedNodes: [],
  savedEdges: [],
  isDirty: false,
  isLoading: false,
  isSaving: false,
  loadError: null,
  saveError: null,

  setLoading: (v) => set({ isLoading: v }),
  setLoadError: (err) => set({ loadError: err, isLoading: false }),

  loadDiagram: (meta, nodes, edges) => set({
    meta,
    nodes: [...nodes],
    edges: [...edges],
    savedNodes: [...nodes],
    savedEdges: [...edges],
    isDirty: false,
    isLoading: false,
    loadError: null,
    saveError: null,
  }),

  setSaving: (v) => set({ isSaving: v }),
  setSaveError: (err) => set({ saveError: err, isSaving: false }),

  commitSave: (meta, nodes, edges) => set({
    meta,
    nodes: [...nodes],
    edges: [...edges],
    savedNodes: [...nodes],
    savedEdges: [...edges],
    isDirty: false,
    isSaving: false,
    saveError: null,
  }),

  // Nodes
  setNodes: (nodes) => set({ nodes, isDirty: true }),

  addNode: (node) => set((s) => ({
    nodes: [...s.nodes, node],
    isDirty: true,
  })),

  updateNode: (id, patch) => set((s) => ({
    nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    isDirty: true,
  })),

  removeNode: (id) => set((s) => ({
    nodes: s.nodes.filter((n) => n.id !== id),
    edges: s.edges.filter((e) => e.source !== id && e.target !== id),
    isDirty: true,
  })),

  // Edges
  setEdges: (edges) => set({ edges, isDirty: true }),

  addEdge: (edge) => set((s) => ({
    edges: [...s.edges, edge],
    isDirty: true,
  })),

  updateEdge: (id, patch) => set((s) => ({
    edges: s.edges.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    isDirty: true,
  })),

  removeEdge: (id) => set((s) => ({
    edges: s.edges.filter((e) => e.id !== id),
    isDirty: true,
  })),

  // Reset
  resetToSaved: () => set((s) => ({
    nodes: [...s.savedNodes],
    edges: [...s.savedEdges],
    isDirty: false,
    saveError: null,
  })),

  clearDiagram: () => set({
    meta: null,
    nodes: [],
    edges: [],
    savedNodes: [],
    savedEdges: [],
    isDirty: false,
    isLoading: false,
    isSaving: false,
    loadError: null,
    saveError: null,
  }),
}))

// Selector helpers
export const selectIsDirty = (s: DiagramState) => s.isDirty
export const selectNodes   = (s: DiagramState) => s.nodes
export const selectEdges   = (s: DiagramState) => s.edges
export const selectMeta    = (s: DiagramState) => s.meta
