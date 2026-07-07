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
  // Core equipment
  | 'intake'
  | 'pump'
  | 'valve'
  | 'flowmeter'
  | 'pressure'
  | 'reservoir'
  | 'wtp'
  | 'junction'
  | 'sensor'
  | 'heat_exchanger'
  | 'text_label'
  | 'value_display'
  // PDAM-specific equipment
  | 'aerator'
  | 'filter'
  | 'clarifier'
  | 'chemical_dosing'
  | 'blower'
  | 'check_valve'
  | 'ground_tank'
  | 'elevated_tank'
  | 'distribution'
  | 'meter'
  | 'prv'
  | 'sludge'
  | 'motor'
  | 'generator'
  // Additional valves
  | 'gate_valve'
  | 'butterfly_valve'
  | 'solenoid_valve'
  // Sensors
  | 'level_sensor'
  | 'ph_sensor'
  | 'turbidity_sensor'
  | 'chlorine_sensor'
  | 'temperature_sensor'
  | 'conductivity_sensor'
  | 'do_sensor'
  // Storage
  | 'tank'
  | 'water_tower'
  // Water treatment
  | 'sedimentation'
  | 'uv_disinfection'
  | 'ozone'
  | 'softener'
  // Distribution & network
  | 'dma'
  | 'hydrant'
  | 'customer_meter'
  | 'booster_station'
  // Alarms & status
  | 'alarm'
  | 'indicator'
  | 'status_light'
  // Wastewater & sewer
  | 'wwtp'
  | 'septic_tank'
  | 'lift_station'
  | 'manhole'
  | 'grease_trap'
  // Pipes & fittings
  | 'pipe_straight'
  | 'pipe_elbow'
  | 'pipe_tee'
  | 'reducer'
  | 'expansion_joint'
  // Misc equipment
  | 'compressor'
  | 'fan'
  | 'strainer'
  | 'air_release'
  | 'break_tank'
  | 'sampling_point'
  | 'solar_panel'
  // Layout / grouping
  | 'zone'

export interface ScadaNodePosition {
  x: number
  y: number
}

export interface ScadaNodeSize {
  width: number
  height: number
}

export type ChartType = 'line' | 'gauge' | 'inline'   // jenis visualisasi: line chart, gauge, atau inline (isi tangki mengikuti nilai — khusus reservoir/tank)

export interface ScadaNodeBinding {
  id?: string
  bindingKey: string
  sensorChannelId: string
  displayLabel?: string | null
  unitOverride?: string | null
  transform?: Record<string, unknown> | null
  priorityOrder?: number
  isPrimary?: boolean
  showTrend?: boolean              // tampilkan chart di node
  trendHours?: number              // jendela waktu trend line (default: 1 jam)
  chartType?: ChartType            // 'line' (default) atau 'gauge'
  gaugeMin?: number | null         // batas bawah skala gauge (default 0)
  gaugeMax?: number | null         // batas atas skala gauge (default 100)
  chartTransparent?: boolean       // render chart tanpa kotak background/border (elegan)
  dialShowLabel?: boolean          // mode inline dial: tampilkan juga nilai di label bawah node (default: sembunyi, karena dial sudah menampilkan angka)
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

export type PipeType = 'raw' | 'treated' | 'waste' | 'chemical' | 'electrical' | 'generic' | 'signal'
export type FlowDirection = 'forward' | 'reverse' | 'bidirectional' | 'none'
export type PathMode = 'smoothstep' | 'bezier' | 'straight' | 'step'

export interface ScadaEdgeDto {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
  edgeType?: string
  label?: string | null
  pipeType?: PipeType | null
  pathMode?: PathMode | null
  flowDirection?: FlowDirection | null
  animated?: boolean
  strokeWidth?: number | null
  labelFontSize?: number | null       // edge label font size in px (default: 10)
  showBorder?: boolean                // show/hide the outer pipe wall (default: true)
  borderWidth?: number | null         // extra width added to each side for the wall (default: 2)
  lineCap?: 'round' | 'square' | 'butt' | null  // stroke-linecap for pipe endpoints
  borderRadius?: number | null        // corner radius for smoothstep/step paths (px)
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
  priorityOrder?: number         // dari scada_node_bindings.priority_order (G-4)
  isPrimary?: boolean            // binding utama node (G-4)
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

// ── Node Style Config (custom appearance) ───────────────────

export type IconPosition = 'top' | 'center' | 'left' | 'right' | 'hidden'
export type BgImageFit  = 'cover' | 'contain' | 'fill'
export type NodeRenderMode = 'card' | 'schematic'  // card = dark box, schematic = symbol only
export type LabelPlacement = 'center' | 'bottom' | 'top' | 'left' | 'right'  // where label+value sit relative to symbol

export interface NodeStyleConfig {
  renderMode?: NodeRenderMode        // visual mode: 'card' (default) or 'schematic' (P&ID style)
  labelPlacement?: LabelPlacement    // label/value position: center (overlay), bottom, top, left, right
  glyphVariant?: number
  glyphKey?: ScadaNodeType           // override simbol yang ditampilkan tanpa mengubah type node (presentasi saja)              // index of schematic symbol variant (see schematicVariants), default 0
  iconMode?: 'builtin' | 'custom'    // default: builtin (uses nodeType glyph)
  customSvg?: string                 // raw SVG markup for custom icon
  iconPosition?: IconPosition        // icon placement: top (default), center, left, right, hidden
  iconSize?: number                  // override icon/svg size in px (default: auto-scaled)
  accentColor?: string               // override glyph/status color
  bgColor?: string                   // override background color
  borderColor?: string               // override border color
  borderWidth?: number               // border width in px (0 = no border)
  showBorder?: boolean               // show/hide border entirely (default true)
  borderRadius?: number              // override border radius (px)
  opacity?: number                   // 0-1 node opacity
  bgImage?: string                   // background image URL
  bgImageFit?: BgImageFit            // how bg image fits: cover, contain, fill
  labelFontSize?: number             // label text size in px (default: 10)
  valueFontSize?: number             // live value text size in px (default: auto)
  showValue?: boolean                // show the live value text (e.g. "3.6 bar") under the icon (default: true)
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
