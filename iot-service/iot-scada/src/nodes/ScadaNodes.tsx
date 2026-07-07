// ============================================================
// Individual SCADA Node Components (8 types)
// All delegate to ScadaNodeFrame
// ============================================================

import React from 'react'
import { type NodeProps } from '@xyflow/react'
import { ScadaNodeFrame } from './ScadaNodeFrame'
import { useRuntimeStore } from '@/stores/useRuntimeStore'
import { useUiStore } from '@/stores/useUiStore'
import { useDiagramStore } from '@/stores/useDiagramStore'

interface ScadaNodeData {
  label?: string
  nodeType?: string
  [key: string]: unknown
}

// Stable fallback — zustand v5 selectors must not return a fresh object each render
const DEFAULT_SIZE = { width: 100, height: 100 }

export function createScadaNode(defaultType: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function ScadaNodeComponent({ id, data, selected }: NodeProps<any>) {
    const d = data as ScadaNodeData
    const nodeType = d.nodeType ?? defaultType
    const label    = (d.label as string) ?? defaultType
    const runtime  = useRuntimeStore((s) => s.nodeRuntimeMap[id] ?? null)
    const mode     = useUiStore((s) => s.mode)
    // Get size from store (source of truth) — raw ref + stable fallback
    const nodeSize = useDiagramStore((s) => s.nodes.find((nd) => nd.id === id)?.size) ?? DEFAULT_SIZE

    return (
      <ScadaNodeFrame
        id={id}
        nodeType={nodeType}
        label={label}
        selected={selected}
        runtime={runtime}
        isEditMode={mode === 'edit'}
        width={nodeSize.width}
        height={nodeSize.height}
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
export const HeatExchangerNode = createScadaNode('heat_exchanger')

// ── PDAM-specific equipment ──
export const AeratorNode        = createScadaNode('aerator')
export const FilterNode         = createScadaNode('filter')
export const ClarifierNode      = createScadaNode('clarifier')
export const ChemicalDosingNode = createScadaNode('chemical_dosing')
export const BlowerNode         = createScadaNode('blower')
export const CheckValveNode     = createScadaNode('check_valve')
export const GroundTankNode     = createScadaNode('ground_tank')
export const ElevatedTankNode   = createScadaNode('elevated_tank')
export const TankNode           = createScadaNode('tank')
export const WaterTowerNode     = createScadaNode('water_tower')
export const BreakTankNode      = createScadaNode('break_tank')
export const DistributionNode   = createScadaNode('distribution')
export const MeterNode          = createScadaNode('meter')
export const PrvNode            = createScadaNode('prv')
export const SludgeNode         = createScadaNode('sludge')
export const MotorNode          = createScadaNode('motor')

// ── Sensor Node ─────────────────────────────────────────────
// Unlike equipment nodes that use the factory, SensorNode reads
// config.sensorCategory from the store to determine its icon/color.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function SensorNode({ id, data, selected }: NodeProps<any>) {
  const d = data as ScadaNodeData
  const label   = (d.label as string) ?? 'Sensor'
  const runtime = useRuntimeStore((s) => s.nodeRuntimeMap[id] ?? null)
  const mode    = useUiStore((s) => s.mode)

  // Split into scalar selectors to avoid new-object-per-render (infinite loop)
  const nodeSize = useDiagramStore((s) => {
    const n = s.nodes.find((nd) => nd.id === id)
    return n?.size ?? null
  })
  const sensorCategory = useDiagramStore((s) => {
    const n = s.nodes.find((nd) => nd.id === id)
    return (n?.config?.sensorCategory as string) ?? 'generic'
  })

  return (
    <ScadaNodeFrame
      id={id}
      nodeType="sensor"
      label={label}
      selected={selected}
      runtime={runtime}
      isEditMode={mode === 'edit'}
      width={nodeSize?.width ?? 80}
      height={nodeSize?.height ?? 80}
      sensorCategory={sensorCategory}
    />
  )
}

// Fallback node untuk tipe yang tidak dikenali
export const UnknownNode   = createScadaNode('junction')
