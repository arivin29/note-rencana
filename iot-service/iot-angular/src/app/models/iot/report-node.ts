import { ReportProject } from './report-project';
import { ReportNodeModel } from './report-node-model';
import { NodeLocation, ReportNodeLocation } from './report-node-location';

export type NodeStatus = 'online' | 'offline' | 'degraded';
export type TelemetryMode = 'push' | 'pull';

export interface Node {
  idNode: string;
  idProject: string;
  idNodeModel: string;
  code: string;
  serialNumber?: string;
  devEui?: string;
  ipAddress?: string;
  installDate?: string;
  firmwareVersion?: string;
  batteryType?: string;
  telemetryMode: TelemetryMode;
  telemetryIntervalSec?: number;
  connectivityStatus?: NodeStatus;
  lastSeenAt?: string;
  idCurrentLocation?: string;
}

export interface ReportNode extends Node {
  project: ReportProject;
  nodeModel: ReportNodeModel;
  currentLocation?: ReportNodeLocation | NodeLocation;
}
