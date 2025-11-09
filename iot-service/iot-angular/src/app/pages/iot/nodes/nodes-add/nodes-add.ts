import { Component } from '@angular/core';

interface OwnerOption {
  id: string;
  name: string;
}

interface ProjectOption {
  id: string;
  name: string;
  ownerId: string;
}

interface NodeModelOption {
  id: string;
  vendor: string;
  model: string;
}

interface SensorChannelDraft {
  metricCode: string;
  unit: string;
  register: string;
  minThreshold?: number;
  maxThreshold?: number;
}

interface SensorDraft {
  catalogId: string;
  label: string;
  protocolChannel: string;
  installDate?: string;
  calibrationDue?: string;
  channels: SensorChannelDraft[];
}

@Component({
  selector: 'nodes-add',
  templateUrl: './nodes-add.html',
  styleUrls: ['./nodes-add.scss'],
  standalone: false
})
export class NodesAddPage {
  ownerOptions: OwnerOption[] = [
    { id: 'owner-abc', name: 'PT ABC' },
    { id: 'owner-xyz', name: 'PT XYZ' },
    { id: 'owner-delta', name: 'PT Delta' }
  ];

  projectOptionsAll: ProjectOption[] = [
    { id: 'project-area-a', name: 'Area A', ownerId: 'owner-abc' },
    { id: 'project-plant-south', name: 'Plant South', ownerId: 'owner-xyz' },
    { id: 'project-booster-west', name: 'Booster West', ownerId: 'owner-xyz' },
    { id: 'project-reservoir-b', name: 'Reservoir B', ownerId: 'owner-delta' },
    { id: 'project-pipeline-north', name: 'Pipeline North', ownerId: 'owner-abc' }
  ];

  nodeModels: NodeModelOption[] = [
    { id: 'model-vx-200', vendor: 'VendorX', model: 'VX-200' },
    { id: 'model-hw-550', vendor: 'HydroWorks', model: 'HW-550' },
    { id: 'model-rv-12', vendor: 'RiverTech', model: 'RV-12' }
  ];

  sensorCatalogs = [
    { id: 'catalog-3051', label: 'Rosemount 3051 (Pressure)' },
    { id: 'catalog-flow-rs485', label: 'Siemens FM Mag 6000 (Flow)' },
    { id: 'catalog-energy', label: 'Schneider PowerTag (Energy Meter)' }
  ];

  telemetryModes: Array<'push' | 'pull'> = ['push', 'pull'];
  batteryTypes = ['Li-SOCl2', 'Li-ion', 'AC Mains'];
  protocolChannels = ['4-20mA', 'RS485-Modbus', 'Pulse', 'Digital'];

  form = {
    ownerId: this.ownerOptions[0].id,
    projectId: 'project-area-a',
    nodeModelId: this.nodeModels[0].id,
    code: '',
    serialNumber: '',
    installDate: '',
    devEui: '',
    ipAddress: '',
    firmwareVersion: '',
    batteryType: this.batteryTypes[0],
    telemetryMode: this.telemetryModes[0],
    telemetryInterval: 120,
    locationType: 'manual',
    latitude: '',
    longitude: '',
    elevation: undefined as number | undefined,
    address: ''
  };

  sensors: SensorDraft[] = [
    {
      catalogId: 'catalog-3051',
      label: 'Inlet Pressure',
      protocolChannel: '4-20mA',
      channels: [
        { metricCode: 'pressure', unit: 'bar', register: 'n/a', minThreshold: 1.2, maxThreshold: 3.5 }
      ]
    },
    {
      catalogId: 'catalog-flow-rs485',
      label: 'Main Flow Meter',
      protocolChannel: 'RS485-Modbus',
      channels: [
        { metricCode: 'flow_rate', unit: 'm3/h', register: '30001', minThreshold: 20, maxThreshold: 180 },
        { metricCode: 'pressure', unit: 'bar', register: '30005', minThreshold: 1.5, maxThreshold: 4.0 }
      ]
    }
  ];

  onOwnerChange(ownerId: string) {
    this.form.ownerId = ownerId;
    const projects = this.projectOptions;
    if (projects.length) {
      this.form.projectId = projects[0].id;
    } else {
      this.form.projectId = '';
    }
  }

  onProjectChange(projectId: string) {
    this.form.projectId = projectId;
  }

  get projectOptions() {
    return this.projectOptionsAll.filter((project) => project.ownerId === this.form.ownerId);
  }

  addSensor() {
    this.sensors.push({
      catalogId: this.sensorCatalogs[0]?.id ?? '',
      label: '',
      protocolChannel: this.protocolChannels[0],
      channels: []
    });
  }

  removeSensor(index: number) {
    this.sensors.splice(index, 1);
  }

  addChannel(sensor: SensorDraft) {
    sensor.channels.push({ metricCode: '', unit: '', register: '', minThreshold: undefined, maxThreshold: undefined });
  }

  removeChannel(sensor: SensorDraft, index: number) {
    sensor.channels.splice(index, 1);
  }

  get payloadPreview() {
    return {
      ownerId: this.form.ownerId,
      projectId: this.form.projectId,
      node: {
        nodeModelId: this.form.nodeModelId,
        code: this.form.code,
        serialNumber: this.form.serialNumber,
        installDate: this.form.installDate,
        devEui: this.form.devEui,
        ipAddress: this.form.ipAddress,
        firmwareVersion: this.form.firmwareVersion,
        batteryType: this.form.batteryType,
        telemetry: {
          mode: this.form.telemetryMode,
          intervalSec: this.form.telemetryInterval
        },
        location: {
          type: this.form.locationType,
          latitude: this.form.latitude,
          longitude: this.form.longitude,
          elevation: this.form.elevation,
          address: this.form.address
        }
      },
      sensors: this.sensors.map((sensor) => ({
        catalogId: sensor.catalogId,
        label: sensor.label,
        protocolChannel: sensor.protocolChannel,
        installDate: sensor.installDate,
        calibrationDueAt: sensor.calibrationDue,
        channels: sensor.channels
      }))
    };
  }
}
