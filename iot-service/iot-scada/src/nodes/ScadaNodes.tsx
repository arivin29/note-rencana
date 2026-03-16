// ============================================================
// Individual SCADA Node Components (8 types)
// All delegate to ScadaNodeFrame
// ============================================================

import React from 'react'
import { type NodeProps } from '@xyflow/react'
import { ScadaNodeFrame } from './ScadaNodeFrame'
import { useRuntimeStore } from '@/stores/useRuntimeStore'
import { useUiStore } from '@/stores/useUiStore'

interface ScadaNodeData {
  label?: string
  nodeType?: string
  [key: string]: unknown
}

function createScadaNode(defaultType: string) {
  return function ScadaNodeComponent({ id, data, selected }: NodeProps<ScadaNodeData>) {
    const nodeType = data.nodeType ?? defaultType
    const label    = (data.label as string) ?? defaultType
    const runtime  = useRuntimeStore((s) => s.nodeRuntimeMap[id] ?? null)
    const mode     = useUiStore((s) => s.mode)

    return (
      <ScadaNodeFrame
        id={id}
        nodeType={nodeType}
        label={label}
        selected={selected}
        runtime={runtime}
        isEditMode={mode === 'edit'}
      />
    )
  }
}

export const IntakeNode    = createScadaNode('intake')
export const PumpNode      = createScadaNode('pump')
export const ValveNode     = createScadaNode('valve')
export const FlowmeterNode = createScadaNode('flowmeter')
export const PressureNode  = createScadaNode('pressure')
export const ReservoirNode = createScadaNode('reservoir')
export const WtpNode       = createScadaNode('wtp')
export const JunctionNode  = createScadaNode('junction')

// Fallback node untuk tipe yang tidak dikenali
export const UnknownNode   = createScadaNode('junction')
