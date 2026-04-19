// ============================================================
// useRuntimeStore — Runtime Polling State
// Menyimpan runtime binding values dan polling status
// ============================================================

import { create } from 'zustand'
import type { ScadaRuntimeResponse, NodeRuntimeState, RuntimeStatus } from '@/types/scada'

export interface RuntimeState {
  // Data
  runtime: ScadaRuntimeResponse | null
  nodeRuntimeMap: Record<string, NodeRuntimeState> // nodeId -> runtime state

  // Polling status
  isPolling: boolean
  lastSuccessAt: Date | null
  pollingError: string | null

  // Actions
  setRuntime: (data: ScadaRuntimeResponse) => void
  setPollingError: (err: string) => void
  clearRuntime: () => void
  setIsPolling: (v: boolean) => void
}

function buildNodeRuntimeMap(
  data: ScadaRuntimeResponse,
): Record<string, NodeRuntimeState> {
  const map: Record<string, NodeRuntimeState> = {}

  for (const binding of data.bindings) {
    const nodeId = binding.nodeId
    if (!map[nodeId]) {
      map[nodeId] = {
        primaryValue: null,
        primaryUnit: null,
        primaryPrecision: null,
        primaryStatus: 'unknown' as RuntimeStatus,
        primaryTimestamp: null,
        primaryDisplayLabel: null,
        allBindings: [],
      }
    }

    map[nodeId].allBindings.push(binding)

    // Primary binding — isPrimary tidak tersedia di runtime response
    // Gunakan priorityOrder=0 atau bindingKey='value' atau yang pertama muncul sebagai primary
    const isPrimary = (binding as unknown as { isPrimary?: boolean }).isPrimary
    if (map[nodeId].primaryStatus === 'unknown' || binding.bindingKey === 'value' || isPrimary) {
      map[nodeId].primaryValue     = binding.value ?? null
      map[nodeId].primaryUnit      = binding.unitOverride ?? binding.unit ?? null
      map[nodeId].primaryPrecision = binding.precision ?? null
      map[nodeId].primaryStatus    = binding.status
      map[nodeId].primaryTimestamp = binding.timestamp ?? null
      map[nodeId].primaryDisplayLabel = binding.displayLabel ?? null
    }
  }

  return map
}

export const useRuntimeStore = create<RuntimeState>((set) => ({
  runtime: null,
  nodeRuntimeMap: {},
  isPolling: false,
  lastSuccessAt: null,
  pollingError: null,

  setRuntime: (data) => set({
    runtime: data,
    nodeRuntimeMap: buildNodeRuntimeMap(data),
    lastSuccessAt: new Date(),
    pollingError: null,
  }),

  setPollingError: (err) => set({ pollingError: err }),
  setIsPolling: (v) => set({ isPolling: v }),

  clearRuntime: () => set({
    runtime: null,
    nodeRuntimeMap: {},
    isPolling: false,
    lastSuccessAt: null,
    pollingError: null,
  }),
}))

// Selector helpers
export const selectNodeRuntime = (nodeId: string) =>
  (s: RuntimeState) => s.nodeRuntimeMap[nodeId] ?? null

export const selectPollingStatus = (s: RuntimeState) => ({
  isPolling: s.isPolling,
  lastSuccessAt: s.lastSuccessAt,
  pollingError: s.pollingError,
  summary: s.runtime?.summary ?? null,
})
