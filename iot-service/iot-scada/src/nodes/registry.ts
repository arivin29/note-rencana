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
  TankNode,
  WaterTowerNode,
  BreakTankNode,
  DistributionNode,
  MeterNode,
  PrvNode,
  SludgeNode,
  MotorNode,
  createScadaNode,
} from './ScadaNodes'
import { TextLabelNode } from './TextLabelNode'
import { ValueDisplayNode } from './ValueDisplayNode'
import { ZoneNode } from './ZoneNode'

// Every ScadaNodeType in the union that has no dedicated component above.
// The generic component reads glyph from data.nodeType, so rendering is correct.
// Keep this in sync with ScadaNodeType — anything missing falls back to React Flow's
// "default" node and logs a console warning.
const GENERIC_NODE_TYPES = [
  'generator',
  'gate_valve', 'butterfly_valve', 'solenoid_valve',
  'level_sensor', 'ph_sensor', 'turbidity_sensor', 'chlorine_sensor',
  'temperature_sensor', 'conductivity_sensor', 'do_sensor',
  'sedimentation', 'uv_disinfection', 'ozone', 'softener',
  'dma', 'hydrant', 'customer_meter', 'booster_station',
  'alarm', 'indicator', 'status_light',
  'wwtp', 'septic_tank', 'lift_station', 'manhole', 'grease_trap',
  'pipe_straight', 'pipe_elbow', 'pipe_tee', 'reducer', 'expansion_joint',
  'compressor', 'fan', 'strainer', 'air_release', 'sampling_point', 'solar_panel',
] as const
const genericNodeTypes = Object.fromEntries(
  GENERIC_NODE_TYPES.map((t) => [t, createScadaNode(t)]),
)

// Stabil di module scope agar React Flow tidak re-register tiap render
export const nodeTypes = {
  ...genericNodeTypes,
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
  zone:            ZoneNode,
  // PDAM-specific
  aerator:         AeratorNode,
  filter:          FilterNode,
  clarifier:       ClarifierNode,
  chemical_dosing: ChemicalDosingNode,
  blower:          BlowerNode,
  check_valve:     CheckValveNode,
  ground_tank:     GroundTankNode,
  elevated_tank:   ElevatedTankNode,
  tank:            TankNode,
  water_tower:     WaterTowerNode,
  break_tank:      BreakTankNode,
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
