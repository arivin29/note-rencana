// ============================================================
// SCADA — TypeScript Types
// Sesuai dengan API Contract dokumen 11 dan Domain Model dokumen 2
// ============================================================

// ── Auth ─────────────────────────────────────────────────────

export interface ScadaAuthUser {
  idUser: string
  email: string
  name?: string
  idOwner?: string | null
  role?: string
}

// ── Diagram Metadata ─────────────────────────────────────────

export interface ScadaDiagramMeta {
  id: string
  ownerId: string
  projectId?: string | null
  name: string
  description?: string | null
  diagramCode?: string | null
  status: 'draft' | 'active' | 'archived'
  canvasConfig: CanvasConfig
  runtimeConfig: RuntimeConfig
  createdAt: string
  updatedAt: string
}

export interface CanvasConfig {
  zoom?: number
  viewportX?: number
  viewportY?: number
  showGrid?: boolean
  snapToGrid?: boolean
  backgroundColor?: string
}

export interface RuntimeConfig {
  pollingIntervalMs?: number
  staleTimeoutMs?: number
  showFlowAnimation?: boolean
  showAlarmBadges?: boolean
}

// ── Diagram List Item ─────────────────────────────────────────

export interface ScadaDiagramListItem {
  id: string
  ownerId: string
  projectId?: string | null
  name: string
  description?: string | null
  status: string
  updatedAt: string
  nodeCount?: number
  edgeCount?: number
}

// ── Node ─────────────────────────────────────────────────────

export type ScadaNodeType =
  | 'intake'
  | 'pump'
  | 'valve'
  | 'flowmeter'
  | 'pressure'
  | 'reservoir'
  | 'wtp'
  | 'junction'

export interface ScadaNodePosition {
  x: number
  y: number
}

export interface ScadaNodeSize {
  width: number
  height: number
}

export interface ScadaNodeBinding {
  id?: string
  bindingKey: string
  sensorChannelId: string
  displayLabel?: string | null
  unitOverride?: string | null
  transform?: Record<string, unknown> | null
  priorityOrder?: number
  isPrimary?: boolean
}

export interface ScadaNodeDto {
  id: string
  type: ScadaNodeType | string
  label: string
  position: ScadaNodePosition
  size: ScadaNodeSize
  rotationDeg?: number | null
  zIndex?: number
  relatedNodeId?: string | null
  relatedSensorId?: string | null
  style?: Record<string, unknown>
  config?: Record<string, unknown>
  bindings: ScadaNodeBinding[]
}

// ── Edge ─────────────────────────────────────────────────────

export type PipeType = 'raw' | 'treated'
export type FlowDirection = 'forward' | 'reverse' | 'bidirectional'

export interface ScadaEdgeDto {
  id: string
  source: string
  target: string
  edgeType?: string
  label?: string | null
  pipeType?: PipeType | null
  flowDirection?: FlowDirection | null
  animated?: boolean
  style?: Record<string, unknown>
  config?: Record<string, unknown>
}

// ── Diagram Detail ────────────────────────────────────────────

export interface ScadaDiagramDetail {
  diagram: ScadaDiagramMeta
  nodes: ScadaNodeDto[]
  edges: ScadaEdgeDto[]
}

// ── Runtime ──────────────────────────────────────────────────

export type RuntimeStatus =
  | 'ok'
  | 'warn'
  | 'alert'
  | 'off'
  | 'stale'
  | 'offline'
  | 'unknown'

export interface ScadaRuntimeBindingDto {
  bindingId: string
  nodeId: string
  bindingKey: string
  sensorChannelId: string
  sensorTypeId?: string | null
  category?: string | null
  unit?: string | null
  precision?: number | null
  timestamp?: string | null
  value?: number | null
  rawValue?: number | null
  qualityFlag?: string | null
  status: RuntimeStatus
  connectivityState: string
  freshnessState: string
  displayLabel?: string | null
  unitOverride?: string | null
}

export interface ScadaRuntimeResponse {
  diagramId: string
  polledAt: string
  bindings: ScadaRuntimeBindingDto[]
  summary: {
    totalBindings: number
    offlineBindings: number
    staleBindings: number
  }
}

// ── Runtime State per Node ────────────────────────────────────

export interface NodeRuntimeState {
  primaryValue?: number | null
  primaryUnit?: string | null
  primaryPrecision?: number | null
  primaryStatus: RuntimeStatus
  primaryTimestamp?: string | null
  primaryDisplayLabel?: string | null
  allBindings: ScadaRuntimeBindingDto[]
}

// ── Binding Options ───────────────────────────────────────────

export interface BindingOptionChannel {
  channelId: string
  channelName?: string
  sensorId: string
  sensorName?: string
  nodeId?: string | null
  nodeName?: string | null
  projectId?: string | null
  projectName?: string | null
  sensorTypeId?: string | null
  category?: string | null
  defaultUnit?: string | null
  precision?: number | null
  minThreshold?: number | null
  maxThreshold?: number | null
}

// ── Create / Update DTOs ─────────────────────────────────────

export interface CreateDiagramPayload {
  name: string
  description?: string
  ownerId: string
  projectId?: string | null
  canvasConfig?: CanvasConfig
  runtimeConfig?: RuntimeConfig
}

export interface UpdateDiagramPayload {
  diagram: {
    name: string
    description?: string | null
    projectId?: string | null
    diagramCode?: string | null
    status?: string
    canvasConfig?: CanvasConfig
    runtimeConfig?: RuntimeConfig
  }
  nodes: ScadaNodeDto[]
  edges: ScadaEdgeDto[]
}

export interface DuplicateDiagramPayload {
  name: string
  projectId?: string | null
}

// ── API List Query ────────────────────────────────────────────

export interface ListDiagramsQuery {
  projectId?: string
  ownerId?: string
  status?: string
}
