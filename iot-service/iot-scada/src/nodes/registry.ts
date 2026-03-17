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
  SensorNode,
  HeatExchangerNode,
  UnknownNode,
  // PDAM-specific
  AeratorNode,
  FilterNode,
  ClarifierNode,
  ChemicalDosingNode,
  BlowerNode,
  CheckValveNode,
  GroundTankNode,
  ElevatedTankNode,
  DistributionNode,
  MeterNode,
  PrvNode,
  SludgeNode,
  MotorNode,
} from './ScadaNodes'
import { TextLabelNode } from './TextLabelNode'
import { ValueDisplayNode } from './ValueDisplayNode'

// Stabil di module scope agar React Flow tidak re-register tiap render
export const nodeTypes = {
  intake:          IntakeNode,
  pump:            PumpNode,
  valve:           ValveNode,
  flowmeter:       FlowmeterNode,
  pressure:        PressureNode,
  reservoir:       ReservoirNode,
  wtp:             WtpNode,
  junction:        JunctionNode,
  sensor:          SensorNode,
  heat_exchanger:  HeatExchangerNode,
  text_label:      TextLabelNode,
  value_display:   ValueDisplayNode,
  // PDAM-specific
  aerator:         AeratorNode,
  filter:          FilterNode,
  clarifier:       ClarifierNode,
  chemical_dosing: ChemicalDosingNode,
  blower:          BlowerNode,
  check_valve:     CheckValveNode,
  ground_tank:     GroundTankNode,
  elevated_tank:   ElevatedTankNode,
  distribution:    DistributionNode,
  meter:           MeterNode,
  prv:             PrvNode,
  sludge:          SludgeNode,
  motor:           MotorNode,
  unknown:         UnknownNode,
} as const

export type RegisteredNodeType = keyof typeof nodeTypes

// Re-export from new NodeLibraryDrawer module for compatibility
export { NODE_LIBRARY, NODE_CATALOG } from '@/components/NodeLibraryDrawer'
