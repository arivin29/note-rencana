import { create } from 'zustand';
import type { ScadaRuntimeSnapshot } from '../types/scada';

interface RuntimeState {
  snapshot: ScadaRuntimeSnapshot | null;
  polling: boolean;
  error: string | null;
  setSnapshot: (snapshot: ScadaRuntimeSnapshot) => void;
  setPolling: (polling: boolean) => void;
  setError: (error: string | null) => void;
}

export const useRuntimeStore = create<RuntimeState>((set) => ({
  snapshot: null,
  polling: false,
  error: null,
  setSnapshot: (snapshot) => set({ snapshot, error: null }),
  setPolling: (polling) => set({ polling }),
  setError: (error) => set({ error }),
}));
