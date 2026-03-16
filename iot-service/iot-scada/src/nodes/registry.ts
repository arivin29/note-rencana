// ============================================================
// Node Registry — mapping type string ke React component
// ============================================================

import {
  IntakeNode,
  PumpNode,
  ValveNode,
  FlowmeterNode,
  PressureNode,
  ReservoirNode,
  WtpNode,
  JunctionNode,
  UnknownNode,
} from './ScadaNodes'

// Stabil di module scope agar React Flow tidak re-register tiap render
export const nodeTypes = {
  intake:     IntakeNode,
  pump:       PumpNode,
  valve:      ValveNode,
  flowmeter:  FlowmeterNode,
  pressure:   PressureNode,
  reservoir:  ReservoirNode,
  wtp:        WtpNode,
  junction:   JunctionNode,
  unknown:    UnknownNode,
} as const

export type RegisteredNodeType = keyof typeof nodeTypes

// Node type library (untuk NodeLibraryDrawer)
export const NODE_LIBRARY = [
  {
    type: 'intake'    as RegisteredNodeType,
    label: 'Intake',
    description: 'Titik pengambilan air baku',
    defaultSize: { width: 100, height: 100 },
  },
  {
    type: 'pump'      as RegisteredNodeType,
    label: 'Pompa',
    description: 'Unit pemompaan',
    defaultSize: { width: 100, height: 100 },
  },
  {
    type: 'valve'     as RegisteredNodeType,
    label: 'Katup/Valve',
    description: 'Katup kontrol aliran',
    defaultSize: { width: 90, height: 90 },
  },
  {
    type: 'flowmeter' as RegisteredNodeType,
    label: 'Flow Meter',
    description: 'Pengukur laju aliran',
    defaultSize: { width: 90, height: 90 },
  },
  {
    type: 'pressure'  as RegisteredNodeType,
    label: 'Pressure Sensor',
    description: 'Sensor tekanan',
    defaultSize: { width: 90, height: 90 },
  },
  {
    type: 'reservoir' as RegisteredNodeType,
    label: 'Reservoir/Bak',
    description: 'Tangki penyimpanan',
    defaultSize: { width: 120, height: 80 },
  },
  {
    type: 'wtp'       as RegisteredNodeType,
    label: 'WTP/IPA',
    description: 'Unit pengolahan air',
    defaultSize: { width: 140, height: 100 },
  },
  {
    type: 'junction'  as RegisteredNodeType,
    label: 'Junction',
    description: 'Titik percabangan pipa',
    defaultSize: { width: 60, height: 60 },
  },
] as const
