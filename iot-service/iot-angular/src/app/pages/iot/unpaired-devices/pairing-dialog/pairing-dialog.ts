import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ProjectsService, UnpairedDevicesService } from '@sdk/core/services';
import { UnpairedDeviceResponseDto, ProjectResponseDto } from '@sdk/core/models';

@Component({
  selector: 'pairing-dialog',
  templateUrl: './pairing-dialog.html',
  styleUrls: ['./pairing-dialog.scss'],
  standalone: false,
})
export class PairingDialogComponent implements OnInit {
  @Input() device!: UnpairedDeviceResponseDto;

  projectId = '';
  nodeName = '';
  nodeDescription = '';

  projects: ProjectResponseDto[] = [];
  loading = false;
  loadingProjects = false;
  error: string | null = null;

  constructor(
    public activeModal: NgbActiveModal,
    private projectsService: ProjectsService,
    private unpairedDevicesService: UnpairedDevicesService,
  ) {}

  ngOnInit(): void {
    this.loadProjects();
    this.nodeName = `Node-${this.device.hardwareId.substring(0, 12)}`;
    this.nodeDescription = `Paired from unpaired device ${this.device.hardwareId}`;
  }

  loadProjects(): void {
    this.loadingProjects = true;

    this.projectsService.projectsControllerFindAll$Response({ limit: 100 }).subscribe({
      next: (response: any) => {
        const body = this.parseResponseBody(response?.body);
        this.projects = (body?.data || body || []) as ProjectResponseDto[];

        // Pre-select suggested project if available
        const suggestedProjectId = this.asString(this.device.suggestedProject);
        if (suggestedProjectId) {
          this.projectId = suggestedProjectId;
        }

        this.loadingProjects = false;
      },
      error: (err) => {
        console.error('Failed to load projects:', err);
        this.projects = [];
        this.loadingProjects = false;
      },
    });
  }

  pairDevice(): void {
    if (!this.projectId) {
      this.error = 'Please select a project';
      return;
    }

    if (!this.device.idNodeModel) {
      this.error = 'Device must have a node model assigned before pairing';
      return;
    }

    this.loading = true;
    this.error = null;

    const pairDto = {
      body: {
        projectId: this.projectId,
        nodeName: this.nodeName || undefined,
        nodeDescription: this.nodeDescription || undefined,
      },
    };

    this.unpairedDevicesService
      .unpairedDevicesControllerPairDevice({
        id: this.device.idNodeUnpairedDevice,
        ...pairDto,
      })
      .subscribe({
        next: () => {
          this.loading = false;
          this.activeModal.close({ success: true });
        },
        error: (err) => {
          console.error('Failed to pair device:', err);
          this.loading = false;
          this.error = err?.error?.message || 'Failed to pair device';
        },
      });
  }

  cancel(): void {
    this.activeModal.dismiss('cancel');
  }

  get canPair(): boolean {
    return !!this.projectId && !!this.device.idNodeModel && !this.loading;
  }

  get deviceInfo(): string {
    const modelName = this.asString(this.device.nodeModelName);
    return `${this.device.hardwareId}${modelName ? ` (${modelName})` : ''}`;
  }

  private asString(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private parseResponseBody(body: unknown): any {
    if (!body) {
      return {};
    }
    if (typeof body === 'string') {
      try {
        return JSON.parse(body);
      } catch (err) {
        console.warn('Failed to parse projects response body', err);
        return {};
      }
    }
    return body;
  }
}
