import { Component } from '@angular/core';

interface NodeRow {
  code: string;
  project: string;
  owner: string;
  status: 'online' | 'offline' | 'degraded';
  firmware: string;
  telemetryMode: 'push' | 'pull';
  lastSeen: string;
}

@Component({
  selector: 'iot-nodes',
  templateUrl: './iot-nodes.html',
  standalone: false
})
export class IotNodesPage {
  filters = {
    owner: 'All Owners',
    project: 'All Projects',
    status: 'All Status'
  };

  nodes: NodeRow[] = [
    { code: 'NODE-001', project: 'Area A', owner: 'PT ABC', status: 'online', firmware: 'v1.3.2', telemetryMode: 'push', lastSeen: '09:12 UTC' },
    { code: 'NODE-014', project: 'Area A', owner: 'PT ABC', status: 'degraded', firmware: 'v1.3.2', telemetryMode: 'push', lastSeen: '08:59 UTC' },
    { code: 'NODE-033', project: 'Plant South', owner: 'PT XYZ', status: 'online', firmware: 'v2.0.1', telemetryMode: 'pull', lastSeen: '09:10 UTC' },
    { code: 'NODE-071', project: 'Booster West', owner: 'PT XYZ', status: 'offline', firmware: 'v1.1.9', telemetryMode: 'push', lastSeen: '06:41 UTC' },
    { code: 'NODE-099', project: 'Reservoir B', owner: 'PT Delta', status: 'online', firmware: 'v1.3.2', telemetryMode: 'pull', lastSeen: '09:08 UTC' }
  ];

  statusOptions = ['All Status', 'online', 'degraded', 'offline'];
  ownerOptions = ['All Owners', 'PT ABC', 'PT XYZ', 'PT Delta'];
  projectOptions = ['All Projects', 'Area A', 'Plant South', 'Booster West', 'Reservoir B'];

  setFilter(type: 'owner' | 'project' | 'status', value: string) {
    this.filters[type] = value;
  }

  get filteredNodes() {
    return this.nodes.filter((node) => {
      const matchOwner = this.filters.owner === 'All Owners' || node.owner === this.filters.owner;
      const matchProject = this.filters.project === 'All Projects' || node.project === this.filters.project;
      const matchStatus = this.filters.status === 'All Status' || node.status === this.filters.status;
      return matchOwner && matchProject && matchStatus;
    });
  }

  badgeClass(status: NodeRow['status']) {
    switch (status) {
      case 'online':
        return 'badge bg-success';
      case 'degraded':
        return 'badge bg-warning text-dark';
      default:
        return 'badge bg-secondary';
    }
  }
}
