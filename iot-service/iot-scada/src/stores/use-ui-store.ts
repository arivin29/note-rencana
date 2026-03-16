import { create } from 'zustand';

interface UiState {
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  inspectorOpen: boolean;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedEdgeId: (id: string | null) => void;
  setInspectorOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedNodeId: null,
  selectedEdgeId: null,
  inspectorOpen: false,
  setSelectedNodeId: (selectedNodeId) => set({ selectedNodeId, selectedEdgeId: null }),
  setSelectedEdgeId: (selectedEdgeId) => set({ selectedEdgeId, selectedNodeId: null }),
  setInspectorOpen: (inspectorOpen) => set({ inspectorOpen }),
}));
