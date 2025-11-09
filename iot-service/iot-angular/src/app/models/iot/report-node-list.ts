import { ReportOwner } from './report-owner';
import { ReportProject } from './report-project';
import { NodeStatus, TelemetryMode } from './report-node';

export interface ReportNodeListRow {
  code: string;
  project: ReportProject['name'];
  owner: ReportOwner['name'];
  status: NodeStatus;
  firmware: string;
  telemetryMode: TelemetryMode;
  lastSeen: string;
}
