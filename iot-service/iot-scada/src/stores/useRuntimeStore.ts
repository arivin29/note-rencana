// ============================================================
// useRuntimeStore — Runtime Polling State
// Menyimpan runtime binding values dan polling status
// ============================================================

import { create } from 'zustand'
import type { ScadaRuntimeResponse, ScadaRuntimeBindingDto, NodeRuntimeState, RuntimeStatus } from '@/types/scada'

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

// Pilih binding utama sebuah node (G-4). Prioritas:
//   1. isPrimary === true  (tie-break: priorityOrder terkecil)
//   2. bindingKey === 'value'
//   3. priorityOrder terkecil
//   4. binding pertama
function pickPrimaryBinding(
  bindings: ScadaRuntimeBindingDto[],
): ScadaRuntimeBindingDto | null {
  if (bindings.length === 0) return null
  const po = (b: ScadaRuntimeBindingDto) => b.priorityOrder ?? Number.MAX_SAFE_INTEGER

  const primaries = bindings.filter((b) => b.isPrimary)
  if (primaries.length > 0) {
    return primaries.reduce((best, b) => (po(b) < po(best) ? b : best))
  }

  const valueKey = bindings.find((b) => b.bindingKey === 'value')
  if (valueKey) return valueKey

  return bindings.reduce((best, b) => (po(b) < po(best) ? b : best))
}

function buildNodeRuntimeMap(
  data: ScadaRuntimeResponse,
): Record<string, NodeRuntimeState> {
  // Pass 1 — kelompokkan semua binding per node
  const byNode: Record<string, ScadaRuntimeBindingDto[]> = {}
  for (const binding of data.bindings) {
    ;(byNode[binding.nodeId] ??= []).push(binding)
  }

  // Pass 2 — tentukan primary dari isPrimary/priorityOrder, bukan urutan kedatangan
  const map: Record<string, NodeRuntimeState> = {}
  for (const [nodeId, bindings] of Object.entries(byNode)) {
    const primary = pickPrimaryBinding(bindings)
    map[nodeId] = {
      primaryValue:        primary?.value ?? null,
      primaryUnit:         primary?.unitOverride ?? primary?.unit ?? null,
      primaryPrecision:    primary?.precision ?? null,
      primaryStatus:       primary?.status ?? ('unknown' as RuntimeStatus),
      primaryTimestamp:    primary?.timestamp ?? null,
      primaryDisplayLabel: primary?.displayLabel ?? null,
      allBindings:         bindings,
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
