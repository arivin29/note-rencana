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

interface HistorySnapshot { nodes: ScadaNodeDto[]; edges: ScadaEdgeDto[] }

export interface DiagramState {
  // Metadata & snapshot
  meta: ScadaDiagramMeta | null
  nodes: ScadaNodeDto[]
  edges: ScadaEdgeDto[]

  // Saved snapshot (last persisted to server)
  savedNodes: ScadaNodeDto[]
  savedEdges: ScadaEdgeDto[]

  // Undo/redo history (nodes+edges only)
  past: HistorySnapshot[]
  future: HistorySnapshot[]
  lastPushAt: number
  undo: () => void
  redo: () => void

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

  // Actions — Meta
  updateMeta: (patch: Partial<ScadaDiagramMeta>) => void

  // Actions — Dirty
  resetToSaved: () => void
  clearDiagram: () => void
}

// History config
const HISTORY_LIMIT = 60
const COALESCE_MS = 400

// Wrap a nodes/edges mutation so the PRE-change state is pushed to the undo stack.
// Rapid successive mutations (e.g. a resize/drag firing many updates) coalesce into a
// single undo step via a sliding time window.
function withHistory(
  s: DiagramState,
  next: Partial<Pick<DiagramState, 'nodes' | 'edges'>>,
): Partial<DiagramState> {
  const now = Date.now()
  const coalesce = s.past.length > 0 && now - s.lastPushAt < COALESCE_MS
  const past = coalesce
    ? s.past
    : [...s.past, { nodes: s.nodes, edges: s.edges }].slice(-HISTORY_LIMIT)
  return { ...next, past, future: [], lastPushAt: now, isDirty: true }
}

export const useDiagramStore = create<DiagramState>((set, get) => ({
  meta: null,
  nodes: [],
  edges: [],
  savedNodes: [],
  savedEdges: [],
  past: [],
  future: [],
  lastPushAt: 0,
  isDirty: false,
  isLoading: false,
  isSaving: false,
  loadError: null,
  saveError: null,

  undo: () => set((s) => {
    if (s.past.length === 0) return {}
    const prev = s.past[s.past.length - 1]
    return {
      nodes: prev.nodes,
      edges: prev.edges,
      past: s.past.slice(0, -1),
      future: [{ nodes: s.nodes, edges: s.edges }, ...s.future].slice(0, HISTORY_LIMIT),
      isDirty: true,
      lastPushAt: 0,
    }
  }),

  redo: () => set((s) => {
    if (s.future.length === 0) return {}
    const nextSnap = s.future[0]
    return {
      nodes: nextSnap.nodes,
      edges: nextSnap.edges,
      future: s.future.slice(1),
      past: [...s.past, { nodes: s.nodes, edges: s.edges }].slice(-HISTORY_LIMIT),
      isDirty: true,
      lastPushAt: 0,
    }
  }),

  setLoading: (v) => set({ isLoading: v }),
  setLoadError: (err) => set({ loadError: err, isLoading: false }),

  loadDiagram: (meta, nodes, edges) => set({
    meta,
    nodes: [...nodes],
    edges: [...edges],
    savedNodes: [...nodes],
    savedEdges: [...edges],
    past: [],
    future: [],
    lastPushAt: 0,
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
  setNodes: (nodes) => set((s) => withHistory(s, { nodes })),

  addNode: (node) => set((s) => withHistory(s, { nodes: [...s.nodes, node] })),

  updateNode: (id, patch) => set((s) => withHistory(s, {
    nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
  })),

  removeNode: (id) => set((s) => withHistory(s, {
    nodes: s.nodes.filter((n) => n.id !== id),
    edges: s.edges.filter((e) => e.source !== id && e.target !== id),
  })),

  // Edges
  setEdges: (edges) => set((s) => withHistory(s, { edges })),

  addEdge: (edge) => set((s) => withHistory(s, { edges: [...s.edges, edge] })),

  updateEdge: (id, patch) => set((s) => withHistory(s, {
    edges: s.edges.map((e) => (e.id === id ? { ...e, ...patch } : e)),
  })),

  removeEdge: (id) => set((s) => withHistory(s, {
    edges: s.edges.filter((e) => e.id !== id),
  })),

  // Meta
  updateMeta: (patch) => set((s) => ({
    meta: s.meta ? { ...s.meta, ...patch } : s.meta,
    isDirty: true,
  })),

  // Reset
  resetToSaved: () => set((s) => ({
    nodes: [...s.savedNodes],
    edges: [...s.savedEdges],
    past: [],
    future: [],
    lastPushAt: 0,
    isDirty: false,
    saveError: null,
  })),

  clearDiagram: () => set({
    meta: null,
    nodes: [],
    edges: [],
    savedNodes: [],
    savedEdges: [],
    past: [],
    future: [],
    lastPushAt: 0,
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
