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
  serialNumber: string;
  idNodeModel: string;
  connectivityStatus?: string;
  lastSeenAt?: string;
  nodeModel?: { name?: string };
}

export interface NewNodeForm {
  ownerId?: string;
  projectId?: string;
  nodeModelId: string;
  code: string;
  serialNumber: string;
  devEui: string;
  ipAddress: string;
  firmwareVersion: string;
  batteryType: string;
  telemetryMode: 'push' | 'pull';
  telemetryIntervalSec: number;
  locationType: 'manual' | 'gps';
  latitude: string;
  longitude: string;
  address: string;
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
}

export interface AddedChannel {
  tempId: string;
  templateId: string;
  template: SensorChannelTemplate;
  enabled: boolean;
  mappedField?: PayloadField;
}
