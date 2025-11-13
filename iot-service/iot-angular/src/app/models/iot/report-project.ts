import { Owner, ReportOwner } from './report-owner';

export type ProjectAreaType = 'plant' | 'pipeline' | 'farm' | 'industrial' | 'other';

export interface Project {
  idProject: string;
  idOwner: string;
  name: string;
  areaType?: ProjectAreaType;
  geofence?: Record<string, unknown>;
  status?: 'active' | 'inactive' | 'archived';
}

export interface ReportProject extends Project {
  owner: ReportOwner | Owner;
}
