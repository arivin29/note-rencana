export type NodeLocationType = 'manual' | 'gps' | 'import';

export interface NodeLocation {
  idNodeLocation: string;
  idProject: string;
  type: NodeLocationType;
  coordinates: {
    lat: number;
    lng: number;
  };
  elevation?: number;
  address?: string;
  precisionM?: number;
  source?: string;
}

export interface ReportNodeLocation extends NodeLocation {}
