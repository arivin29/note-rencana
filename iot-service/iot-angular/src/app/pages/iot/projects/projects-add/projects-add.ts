import { Component } from '@angular/core';
import { Owner } from '../../../../models/iot';

type AreaType = 'plant' | 'pipeline' | 'farm' | 'other';
type ProjectStatus = 'active' | 'maintenance' | 'offline';

interface ProjectForm {
  ownerId: Owner['idOwner'];
  name: string;
  projectCode: string;
  areaType: AreaType;
  status: ProjectStatus;
  description: string;
  geoLat: string;
  geoLng: string;
  geoJson: string;
  targetNodes: number;
  targetSensors: number;
  telemetryMode: 'push' | 'pull';
  telemetryInterval: number;
  slaLevel: string;
  notes: string;
}

@Component({
  selector: 'projects-add',
  templateUrl: './projects-add.html',
  styleUrls: ['./projects-add.scss'],
  standalone: false
})
export class ProjectsAddPage {
  ownerOptions: Owner[] = [
    { idOwner: 'owner-abc', name: 'PT ABC' },
    { idOwner: 'owner-xyz', name: 'PT XYZ' },
    { idOwner: 'owner-delta', name: 'PT Delta' }
  ];

  areaTypes: AreaType[] = ['plant', 'pipeline', 'farm', 'other'];
  statuses: ProjectStatus[] = ['active', 'maintenance', 'offline'];
  telemetryModes: Array<'push' | 'pull'> = ['push', 'pull'];

  form: ProjectForm = {
    ownerId: this.ownerOptions[0].idOwner,
    name: '',
    projectCode: '',
    areaType: 'plant',
    status: 'active',
    description: '',
    geoLat: '',
    geoLng: '',
    geoJson: '',
    targetNodes: 10,
    targetSensors: 25,
    telemetryMode: 'push',
    telemetryInterval: 120,
    slaLevel: 'gold',
    notes: ''
  };

  submitProject() {
    console.table(this.projectPayload);
    alert('Demo only: payload logged to console table.');
  }

  get projectPayload() {
    return {
      ownerId: this.form.ownerId,
      name: this.form.name,
      code: this.form.projectCode || `PRJ-${Date.now()}`,
      areaType: this.form.areaType,
      status: this.form.status,
      description: this.form.description,
      telemetry: {
        mode: this.form.telemetryMode,
        intervalSec: this.form.telemetryInterval
      },
      targets: {
        nodes: this.form.targetNodes,
        sensors: this.form.targetSensors
      },
      geolocation: {
        lat: this.form.geoLat,
        lng: this.form.geoLng,
        geoJson: this.form.geoJson
      },
      slaLevel: this.form.slaLevel,
      notes: this.form.notes
    };
  }
}
