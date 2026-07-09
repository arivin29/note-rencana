import { OwnerForwardingMqtt } from '../../entities/existing';

/**
 * Baris hasil query iot.sensor_channel_latest (lihat forwarding-worker.fetchSensorChannelLatest).
 */
export interface ChannelLatestRow {
  channel_id: string;
  last_update: string;
  device_id: string;
  owner_code: string;
  owner_id: string;
  project_code: string;
  project_id: string;
  node_id: string;
  node_code: string;
  node_model: string;
  sensor_id: string;
  sensor_label: string;
  sensor_catalog: string;
  metric_code: string;
  metric_unit: string;
  raw_value: number;
  eng_value: number;
  signal_quality: string;
  last_iot_log_id: string;
  min_threshold: number;
  max_threshold: number;
}

/**
 * Payload MQTT — versioned (§6 spec).
 * Membawa rantai ID penuh owner → project → node → sensor → sensor_channel,
 * dengan penamaan yang COCOK External API (idNode, idSensorChannel) agar PDAM
 * bisa join data MQTT ke API mereka (mis. GET sensor-data?channelId=idSensorChannel).
 */
export interface TelemetryPayload {
  schemaVersion: number;
  category: string;
  // Owner
  idOwner: string;
  ownerCode: string;
  // Project
  idProject: string;
  projectCode: string;
  // Node
  idNode: string;
  nodeCode: string;
  deviceId: string;
  // Sensor
  idSensor: string;
  sensorLabel: string;
  sensorCatalog: string;
  // Sensor Channel (kunci join ke External API: channelId = idSensorChannel)
  idSensorChannel: string;
  metricCode: string;
  unit: string;
  // Nilai
  value: number;
  rawValue: number;
  quality: string;
  ts: string;
}

const SCHEMA_VERSION = 1;

/**
 * Bangun topik dari template. Placeholder yang didukung:
 * {ownerCode} {deviceId} {metricCode} {nodeCode} {sensorId} {channelId} {category}
 */
export function buildTopic(
  template: string,
  row: ChannelLatestRow,
  category = 'telemetry',
): string {
  const map: Record<string, string> = {
    ownerCode: row.owner_code ?? '',
    deviceId: row.device_id ?? '',
    metricCode: row.metric_code ?? '',
    nodeCode: row.node_code ?? '',
    sensorId: row.sensor_id ?? '',
    channelId: row.channel_id ?? '',
    category,
  };
  return template
    .replace(/\{(\w+)\}/g, (_, key) => (key in map ? map[key] : ''))
    // rapikan slash ganda / trailing akibat placeholder kosong
    .replace(/\/{2,}/g, '/')
    .replace(/\/+$/, '');
}

export function buildPayload(row: ChannelLatestRow, category = 'telemetry'): TelemetryPayload {
  return {
    schemaVersion: SCHEMA_VERSION,
    category,
    // owner → project → node → sensor → sensor_channel
    idOwner: row.owner_id,
    ownerCode: row.owner_code,
    idProject: row.project_id,
    projectCode: row.project_code,
    idNode: row.node_id,
    nodeCode: row.node_code,
    deviceId: row.device_id,
    idSensor: row.sensor_id,
    sensorLabel: row.sensor_label,
    sensorCatalog: row.sensor_catalog,
    idSensorChannel: row.channel_id, // = External API idSensorChannel / param channelId
    metricCode: row.metric_code,
    unit: row.metric_unit,
    value: row.eng_value,
    rawValue: row.raw_value,
    quality: row.signal_quality,
    ts: row.last_update,
  };
}

/**
 * Kategori aktif untuk config. Default & fallback ["telemetry"].
 * Array KOSONG diperlakukan sebagai default (bukan "tak ada") — nonaktif total pakai is_active.
 * Aman terhadap jsonb string/array.
 */
export function activeCategories(config: OwnerForwardingMqtt): string[] {
  const raw = config.enabledCategories as unknown;
  let arr: string[] | null = null;
  if (Array.isArray(raw)) {
    arr = raw as string[];
  } else if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) arr = parsed;
    } catch {
      arr = null;
    }
  }
  return arr && arr.length > 0 ? arr : ['telemetry'];
}
