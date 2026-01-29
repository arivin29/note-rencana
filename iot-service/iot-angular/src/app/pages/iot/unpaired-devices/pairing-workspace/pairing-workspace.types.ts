export interface SamplePayload {
  id: string;
  receivedAt: string;
  topic: string;
  rawData: any;
}

export interface PayloadField {
  path: string;
  key: string;
  value: any;
  type: string;
  displayValue: string;
}

export interface NodeConfig {
  mode: 'existing' | 'new';
  selectedExistingNode?: ExistingNode;
  newNode?: NewNodeForm;
}

export interface ExistingNode {
  idNode: string;
  code: string;
  name?: string;
  serialNumber: string;
  idNodeModel: string;
  connectivityStatus?: string;
  lastSeenAt?: string;
  city?: string;
  address?: string;
  nodeModel?: { name?: string };
}

export interface NewNodeForm {
  ownerId?: string;
  projectId?: string;
  nodeModelId: string;
  code: string;
  name: string;
  description: string;
  serialNumber: string;
  devEui: string;
  ipAddress: string;
  firmwareVersion: string;
  batteryType: string;
  telemetryMode: 'push' | 'pull';
  telemetryIntervalSec: number;
  // Location fields
  address: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  latitude: string;
  longitude: string;
  elevationM: string;
  // Status & Environment
  status: string;
  installationType: string;
  enclosureRating: string;
  powerSource: string;
  // PIC
  picName: string;
  picPhone: string;
  picEmail: string;
  // Notes
  notes: string;
}

export interface NodeModel {
  idNodeModel: string;
  name: string;
  manufacturer: string;
  description: string;
}

export interface SensorCatalog {
  idSensorCatalog: string;
  name: string;
  manufacturer: string;
  modelNumber: string;
  sensorType: string;
  protocolChannel: string;
  measurementRange: string;
  accuracy: string;
  channels: SensorChannelTemplate[];
}

export interface SensorChannelTemplate {
  idChannelTemplate: string;
  channelName: string;
  channelCode: string;
  metricName: string;
  unit: string;
  aggregation: 'avg' | 'sum' | 'min' | 'max' | 'last';
  dataType: 'float' | 'integer' | 'boolean' | 'string';
}

export interface AddedSensor {
  tempId: string;
  catalogId: string;
  catalog: SensorCatalog;
  label: string;
  protocolChannel: string;
  channels: AddedChannel[];
  idSensor?: string; // Actual database sensor ID (populated when sensor exists)
}

export interface AddedChannel {
  tempId: string;
  templateId: string;
  template: SensorChannelTemplate;
  enabled: boolean;
  mappedField?: PayloadField;
  idSensorChannel?: string; // Actual database channel ID (populated when channel exists)
}
