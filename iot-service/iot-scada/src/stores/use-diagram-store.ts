import { create } from 'zustand';
import type { ScadaDiagramDetail } from '../types/scada';

interface DiagramState {
  saved: ScadaDiagramDetail | null;
  working: ScadaDiagramDetail | null;
  dirty: boolean;
  setInitialDiagram: (diagram: ScadaDiagramDetail) => void;
  commitSavedDiagram: (diagram: ScadaDiagramDetail) => void;
  replaceWorkingDiagram: (diagram: ScadaDiagramDetail) => void;
  resetWorkingCopy: () => void;
  addNode: () => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  addEdge: (source: string, target: string) => void;
  removeNode: (nodeId: string) => void;
  removeEdge: (edgeId: string) => void;
}

export const useDiagramStore = create<DiagramState>((set) => ({
  saved: null,
  working: null,
  dirty: false,
  setInitialDiagram: (diagram) =>
    set({
      saved: diagram,
      working: diagram,
      dirty: false,
    }),
  commitSavedDiagram: (diagram) =>
    set({
      saved: diagram,
      working: diagram,
      dirty: false,
    }),
  replaceWorkingDiagram: (diagram) =>
    set((state) => ({
      saved: state.saved,
      working: diagram,
      dirty: true,
    })),
  resetWorkingCopy: () =>
    set((state) => ({
      saved: state.saved,
      working: state.saved,
      dirty: false,
    })),
  addNode: () =>
    set((state) => {
      if (!state.working) {
        return state;
      }

      const nodeIndex = state.working.nodes.length + 1;
      return {
        ...state,
        working: {
          ...state.working,
          nodes: [
            ...state.working.nodes,
            {
              id: crypto.randomUUID(),
              type: 'junction',
              label: `New Node ${nodeIndex}`,
              position: { x: 120 + nodeIndex * 36, y: 120 + nodeIndex * 24 },
              size: { width: 140, height: 88 },
              rotationDeg: 0,
              zIndex: nodeIndex,
              style: {},
              config: {},
              bindings: [],
            },
          ],
        },
        dirty: true,
      };
    }),
  updateNodePosition: (nodeId, position) =>
    set((state) => {
      if (!state.working) {
        return state;
      }

      return {
        ...state,
        working: {
          ...state.working,
          nodes: state.working.nodes.map((node) => (node.id === nodeId ? { ...node, position } : node)),
        },
        dirty: true,
      };
    }),
  addEdge: (source, target) =>
    set((state) => {
      if (!state.working || source === target) {
        return state;
      }

      return {
        ...state,
        working: {
          ...state.working,
          edges: [
            ...state.working.edges,
            {
              id: crypto.randomUUID(),
              source,
              target,
              edgeType: 'pipe',
              label: null,
              pipeType: 'treated',
              flowDirection: 'forward',
              animated: false,
              style: {},
              config: {},
            },
          ],
        },
        dirty: true,
      };
    }),
  removeNode: (nodeId) =>
    set((state) => {
      if (!state.working) {
        return state;
      }

      return {
        ...state,
        working: {
          ...state.working,
          nodes: state.working.nodes.filter((node) => node.id !== nodeId),
          edges: state.working.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
        },
        dirty: true,
      };
    }),
  removeEdge: (edgeId) =>
    set((state) => {
      if (!state.working) {
        return state;
      }

      return {
        ...state,
        working: {
          ...state.working,
          edges: state.working.edges.filter((edge) => edge.id !== edgeId),
        },
        dirty: true,
      };
    }),
}));
