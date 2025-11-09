import { Owner, ReportOwner } from './report-owner';
import { Project, ReportProject } from './report-project';
import { Node, ReportNode } from './report-node';
import { NodeLocation, ReportNodeLocation } from './report-node-location';

export interface NodeAssignment {
  idNodeAssignment: string;
  idNode: string;
  idProject: string;
  idOwner: string;
  idNodeLocation?: string;
  startAt: string;
  endAt?: string;
  reason?: string;
  assignedBy?: string;
  ticketRef?: string;
}

export interface ReportNodeAssignment extends NodeAssignment {
  node: ReportNode | Node;
  project: ReportProject | Project;
  owner: ReportOwner | Owner;
  location?: ReportNodeLocation | NodeLocation;
}
