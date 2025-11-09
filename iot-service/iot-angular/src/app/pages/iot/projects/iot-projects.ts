import { Component } from '@angular/core';

interface ProjectSummary {
  id: string;
  owner: string;
  name: string;
  nodes: number;
  sensors: number;
  online: number;
  alerts: number;
}

@Component({
  selector: 'iot-projects',
  templateUrl: './iot-projects.html',
  standalone: false
})
export class IotProjectsPage {
  projects: ProjectSummary[] = [
    { id: 'PRJ-45', owner: 'PT ABC', name: 'Area A', nodes: 100, sensors: 230, online: 92, alerts: 4 },
    { id: 'PRJ-51', owner: 'PT ABC', name: 'Reservoir B', nodes: 32, sensors: 74, online: 28, alerts: 1 },
    { id: 'PRJ-09', owner: 'PT XYZ', name: 'Plant South', nodes: 27, sensors: 65, online: 25, alerts: 0 }
  ];
}
