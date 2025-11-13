import { Component, OnInit } from '@angular/core';
import { OwnersService } from '../../../../../sdk/core/services/owners.service';
import { ProjectsService } from '../../../../../sdk/core/services/projects.service';
import { NodeModelsService } from '../../../../../sdk/core/services/node-models.service';
import { SensorCatalogsService } from '../../../../../sdk/core/services/sensor-catalogs.service';

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

interface SensorCatalogOption {
  id: string;
  label: string;
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
export class NodesAddPage implements OnInit {
  ownerOptions: OwnerOption[] = [];
  projectOptionsAll: ProjectOption[] = [];
  nodeModels: NodeModelOption[] = [];
  sensorCatalogs: SensorCatalogOption[] = [];

  telemetryModes: Array<'push' | 'pull'> = ['push', 'pull'];
  batteryTypes = ['Li-SOCl2', 'Li-ion', 'AC Mains'];
  protocolChannels = ['4-20mA', 'RS485-Modbus', 'Pulse', 'Digital'];

  form = {
    ownerId: '',
    projectId: '',
    nodeModelId: '',
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

  sensors: SensorDraft[] = [];

  constructor(
    private ownersService: OwnersService,
    private projectsService: ProjectsService,
    private nodeModelsService: NodeModelsService,
    private sensorCatalogsService: SensorCatalogsService
  ) {}

  ngOnInit(): void {
    this.loadOwnerOptions();
    this.loadProjectOptions();
    this.loadNodeModels();
    this.loadSensorCatalogs();
  }

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

  private loadOwnerOptions() {
    this.ownersService
      .ownersControllerFindAll$Response({ page: 1, limit: 100 })
      .subscribe({
        next: (response) => {
          const body = this.parseBody(response.body);
          const items = this.extractDataArray(body);
          this.ownerOptions = items
            .map((owner: any) => ({
              id: owner?.idOwner || owner?.id || owner?.ownerId || '',
              name: owner?.name || owner?.companyName || 'Owner'
            }))
            .filter((owner: OwnerOption) => owner.id);
          this.syncFormSelections();
        },
        error: (error) => {
          console.error('Failed to load owners', error);
        }
      });
  }

  private loadProjectOptions() {
    this.projectsService
      .projectsControllerFindAll$Response({ page: 1, limit: 200 })
      .subscribe({
        next: (response) => {
          const body = this.parseBody(response.body);
          const items = this.extractDataArray(body);
          this.projectOptionsAll = items
            .map((project: any) => ({
              id: project?.idProject || project?.id || '',
              name: project?.name || 'Project',
              ownerId: project?.idOwner || project?.owner?.idOwner || ''
            }))
            .filter((project: ProjectOption) => project.id && project.ownerId);
          this.syncFormSelections();
        },
        error: (error) => {
          console.error('Failed to load projects', error);
        }
      });
  }

  private loadNodeModels() {
    this.nodeModelsService
      .nodeModelsControllerFindAll$Response({ page: 1, limit: 100 })
      .subscribe({
        next: (response) => {
          const body = this.parseBody(response.body);
          const items = this.extractDataArray(body);
          this.nodeModels = items
            .map((model: any) => ({
              id: model?.idNodeModel || model?.id || '',
              vendor: model?.vendor || '',
              model: model?.modelName || model?.model || ''
            }))
            .filter((model: NodeModelOption) => model.id);
          this.syncFormSelections();
        },
        error: (error) => {
          console.error('Failed to load node models', error);
        }
      });
  }

  private loadSensorCatalogs() {
    this.sensorCatalogsService
      .sensorCatalogsControllerFindAll$Response({ page: 1, limit: 100 })
      .subscribe({
        next: (response) => {
          const body = this.parseBody(response.body);
          const items = this.extractDataArray(body);
          this.sensorCatalogs = items
            .map((catalog: any) => ({
              id: catalog?.idSensorCatalog || catalog?.id || '',
              label: catalog?.modelName
                ? `${catalog.modelName} (${catalog.vendor || 'Unknown'})`
                : catalog?.label || 'Sensor Catalog'
            }))
            .filter((catalog: SensorCatalogOption) => catalog.id);
          if (!this.sensors.length) {
            this.addSensor();
          }
        },
        error: (error) => {
          console.error('Failed to load sensor catalogs', error);
        }
      });
  }

  private syncFormSelections() {
    if (!this.form.ownerId && this.ownerOptions.length) {
      this.form.ownerId = this.ownerOptions[0].id;
    }

    const availableProjects = this.projectOptions;
    if (availableProjects.length && !availableProjects.some((project) => project.id === this.form.projectId)) {
      this.form.projectId = availableProjects[0].id;
    }

    if (!this.form.nodeModelId && this.nodeModels.length) {
      this.form.nodeModelId = this.nodeModels[0].id;
    }
  }

  private parseBody(body: unknown) {
    if (!body) {
      return null;
    }
    if (typeof body === 'string') {
      try {
        return JSON.parse(body);
      } catch (error) {
        console.warn('Failed to parse response body', error);
        return null;
      }
    }
    return body;
  }

  private extractDataArray(payload: any): any[] {
    if (!payload) {
      return [];
    }
    if (Array.isArray(payload)) {
      return payload;
    }
    if (Array.isArray(payload.data)) {
      return payload.data;
    }
    if (Array.isArray(payload.items)) {
      return payload.items;
    }
    return [];
  }
}
