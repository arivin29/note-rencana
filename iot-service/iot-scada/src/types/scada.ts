export type ScadaMode = 'view' | 'edit';

export interface ScadaBinding {
  id: string;
  bindingKey: string;
  sensorChannelId: string;
  displayLabel?: string | null;
  unitOverride?: string | null;
  transform?: Record<string, unknown> | null;
  priorityOrder?: number;
  isPrimary?: boolean;
}

export interface ScadaNodeModel {
  id: string;
  type: string;
  label: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  rotationDeg?: number | null;
  zIndex?: number;
  relatedNodeId?: string | null;
  relatedSensorId?: string | null;
  style?: Record<string, unknown>;
  config?: Record<string, unknown>;
  bindings: ScadaBinding[];
}

export interface ScadaEdgeModel {
  id: string;
  source: string;
  target: string;
  edgeType?: string;
  label?: string | null;
  pipeType?: string | null;
  flowDirection?: string | null;
  animated?: boolean;
  style?: Record<string, unknown>;
  config?: Record<string, unknown>;
}

export interface ScadaDiagramMeta {
  id: string;
  ownerId: string;
  projectId?: string | null;
  name: string;
  description?: string | null;
  diagramCode?: string | null;
  status: string;
  canvasConfig: Record<string, unknown>;
  runtimeConfig: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ScadaDiagramDetail {
  diagram: ScadaDiagramMeta;
  nodes: ScadaNodeModel[];
  edges: ScadaEdgeModel[];
}

export interface ScadaRuntimeBinding {
  bindingId: string;
  nodeId: string;
  bindingKey: string;
  sensorChannelId: string;
  sensorTypeId?: string | null;
  category?: string | null;
  unit?: string | null;
  precision?: number | null;
  timestamp?: string | null;
  value?: number | null;
  rawValue?: number | null;
  status: string;
  qualityFlag?: string | null;
  connectivityState: string;
  freshnessState: string;
  displayLabel?: string | null;
  unitOverride?: string | null;
}

export interface ScadaRuntimeSnapshot {
  diagramId: string;
  polledAt: string;
  bindings: ScadaRuntimeBinding[];
  summary: {
    totalBindings: number;
    offlineBindings: number;
    staleBindings: number;
  };
}
