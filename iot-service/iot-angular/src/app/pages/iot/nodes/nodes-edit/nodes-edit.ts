import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { 
  NodesService, 
  ProjectsService, 
  NodeModelsService
} from 'src/sdk/core/services';
import { 
  ProjectResponseDto,
  NodeModelResponseDto,
  NodeResponseDto,
  UpdateNodeDto,
  CreateNodeDto
} from 'src/sdk/core/models';

// Form interface matching CreateNodeDto/UpdateNodeDto fields
interface NodeForm {
  idProject: string;
  idNodeModel: string;
  code: string;
  serialNumber: string;
  installDate: string;
  devEui: string;
  ipAddress: string;
  firmwareVersion: string;
  batteryType: string;
  telemetryIntervalSec: number;
  connectivityStatus: string;
}

@Component({
  selector: 'nodes-edit',
  templateUrl: './nodes-edit.html',
  styleUrls: ['./nodes-edit.scss'],
  standalone: false
})
export class NodesEditPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Loading states
  loading = true;
  saving = false;
  error: string | null = null;

  // Options loaded from API - using SDK interfaces
  projects: ProjectResponseDto[] = [];
  nodeModels: NodeModelResponseDto[] = [];

  // Static options
  batteryTypes = ['Li-SOCl2', 'Li-ion', 'AC Mains', 'Solar'];
  connectivityStatuses = ['online', 'offline', 'unknown'];

  currentNodeId = '';
  isEditMode = false;

  form: NodeForm = {
    idProject: '',
    idNodeModel: '',
    code: '',
    serialNumber: '',
    installDate: '',
    devEui: '',
    ipAddress: '',
    firmwareVersion: '',
    batteryType: this.batteryTypes[0],
    telemetryIntervalSec: 120,
    connectivityStatus: 'unknown'
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private nodesService: NodesService,
    private projectsService: ProjectsService,
    private nodeModelsService: NodeModelsService
  ) {}

  ngOnInit(): void {
    this.loadDropdownOptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDropdownOptions(): void {
    this.loading = true;
    this.error = null;

    // Load only required dropdown options
    forkJoin({
      projects: this.projectsService.projectsControllerFindAll$Response(),
      nodeModels: this.nodeModelsService.nodeModelsControllerFindAll$Response()
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (responses: any) => {
        // Parse response body (handle both direct array and paginated response)
        const parseBody = (body: any) => {
          if (typeof body === 'string') body = JSON.parse(body);
          return body?.data || body || [];
        };

        // Map to SDK interfaces
        this.projects = parseBody(responses.projects.body) as ProjectResponseDto[];
        this.nodeModels = parseBody(responses.nodeModels.body) as NodeModelResponseDto[];

        console.log('Loaded dropdown options:', {
          projects: this.projects.length,
          nodeModels: this.nodeModels.length
        });

        // Check if we're editing an existing node
        this.route.paramMap.pipe(
          takeUntil(this.destroy$)
        ).subscribe((params) => {
          const nodeId = params.get('nodeId');
          if (nodeId) {
            this.isEditMode = true;
            this.loadNode(nodeId);
          } else {
            // New node mode - set defaults
            this.isEditMode = false;
            this.setDefaultFormValues();
            this.loading = false;
          }
        });
      },
      error: (err) => {
        console.error('Failed to load dropdown options:', err);
        this.error = 'Failed to load form options. Please try again.';
        this.loading = false;
      }
    });
  }

  private setDefaultFormValues(): void {
    if (this.projects.length > 0) {
      this.form.idProject = this.projects[0].idProject;
    }
    if (this.nodeModels.length > 0) {
      this.form.idNodeModel = this.nodeModels[0].idNodeModel;
    }
  }

  private loadNode(nodeId: string): void {
    this.currentNodeId = nodeId;
    
    this.nodesService.nodesControllerFindOne({ id: nodeId }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (node: NodeResponseDto) => {
        // Map node data to form - only fields that exist in DTO
        this.form = {
          idProject: node.idProject || '',
          idNodeModel: node.idNodeModel || '',
          code: node.code || '',
          serialNumber: node.serialNumber || '',
          installDate: node.installDate ? node.installDate.substring(0, 10) : '',
          devEui: node.devEui || '',
          ipAddress: node.ipAddress || '',
          firmwareVersion: node.firmwareVersion || '',
          batteryType: node.batteryType || this.batteryTypes[0],
          telemetryIntervalSec: node.telemetryIntervalSec || 120,
          connectivityStatus: node.connectivityStatus || 'unknown'
        };

        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load node:', err);
        this.error = 'Failed to load node data: ' + (err.error?.message || err.message);
        this.loading = false;
      }
    });
  }

  onProjectChange(projectId: string): void {
    this.form.idProject = projectId;
  }

  onNodeModelChange(nodeModelId: string): void {
    this.form.idNodeModel = nodeModelId;
  }

  // Helper to get project name for display
  getProjectName(projectId: string): string {
    const project = this.projects.find(p => p.idProject === projectId);
    return project?.name || '';
  }

  // Helper to get node model display name
  getNodeModelName(nodeModelId: string): string {
    const model = this.nodeModels.find(m => m.idNodeModel === nodeModelId);
    return model ? model.vendor + ' – ' + model.modelName : '';
  }

  get payloadPreview(): CreateNodeDto | UpdateNodeDto {
    return {
      idProject: this.form.idProject,
      idNodeModel: this.form.idNodeModel,
      code: this.form.code,
      serialNumber: this.form.serialNumber || undefined,
      installDate: this.form.installDate || undefined,
      devEui: this.form.devEui || undefined,
      ipAddress: this.form.ipAddress || undefined,
      firmwareVersion: this.form.firmwareVersion || undefined,
      batteryType: this.form.batteryType || undefined,
      telemetryIntervalSec: this.form.telemetryIntervalSec,
      connectivityStatus: this.form.connectivityStatus || undefined
    };
  }

  saveNode(): void {
    // Validation
    if (!this.form.idProject) {
      this.error = 'Please select a project';
      return;
    }
    if (!this.form.idNodeModel) {
      this.error = 'Please select a node model';
      return;
    }
    if (!this.form.code) {
      this.error = 'Node code is required';
      return;
    }

    this.saving = true;
    this.error = null;

    if (this.isEditMode && this.currentNodeId) {
      // Update existing node
      const updateData: UpdateNodeDto = {
        idProject: this.form.idProject,
        idNodeModel: this.form.idNodeModel,
        code: this.form.code,
        serialNumber: this.form.serialNumber || undefined,
        installDate: this.form.installDate || undefined,
        devEui: this.form.devEui || undefined,
        ipAddress: this.form.ipAddress || undefined,
        firmwareVersion: this.form.firmwareVersion || undefined,
        batteryType: this.form.batteryType || undefined,
        telemetryIntervalSec: this.form.telemetryIntervalSec,
        connectivityStatus: this.form.connectivityStatus || undefined
      };

      this.nodesService.nodesControllerUpdate({
        id: this.currentNodeId,
        body: updateData
      }).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => {
          this.saving = false;
          alert('Node updated successfully!');
          this.router.navigate(['/iot/nodes', this.currentNodeId]);
        },
        error: (err) => {
          console.error('Failed to update node:', err);
          this.error = 'Failed to update node: ' + (err.error?.message || err.message);
          this.saving = false;
        }
      });
    } else {
      // Create new node
      const createData: CreateNodeDto = {
        idProject: this.form.idProject,
        idNodeModel: this.form.idNodeModel,
        code: this.form.code,
        serialNumber: this.form.serialNumber || undefined,
        installDate: this.form.installDate || undefined,
        devEui: this.form.devEui || undefined,
        ipAddress: this.form.ipAddress || undefined,
        firmwareVersion: this.form.firmwareVersion || undefined,
        batteryType: this.form.batteryType || undefined,
        telemetryIntervalSec: this.form.telemetryIntervalSec
      };

      this.nodesService.nodesControllerCreate({
        body: createData
      }).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (response: NodeResponseDto) => {
          this.saving = false;
          const newNodeId = response.idNode;
          alert('Node created successfully!');
          this.router.navigate(['/iot/nodes', newNodeId]);
        },
        error: (err) => {
          console.error('Failed to create node:', err);
          this.error = 'Failed to create node: ' + (err.error?.message || err.message);
          this.saving = false;
        }
      });
    }
  }

  cancel(): void {
    if (this.currentNodeId) {
      this.router.navigate(['/iot/nodes', this.currentNodeId]);
    } else {
      this.router.navigate(['/iot/nodes']);
    }
  }
}
