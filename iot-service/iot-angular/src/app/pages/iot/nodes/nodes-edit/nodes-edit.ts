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
  // Basic Info
  idProject: string;
  idNodeModel: string;
  code: string;
  name: string;
  description: string;
  serialNumber: string;
  installDate: string;
  devEui: string;
  ipAddress: string;
  firmwareVersion: string;
  batteryType: string;
  telemetryIntervalSec: number;
  connectivityStatus: string;
  // Location
  address: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  elevationM: number | null;
  // Status & Maintenance
  status: string;
  commissionedAt: string;
  lastMaintenanceAt: string;
  nextMaintenanceAt: string;
  // Environment
  installationType: string;
  enclosureRating: string;
  powerSource: string;
  // PIC
  picName: string;
  picPhone: string;
  picEmail: string;
  // Notes & Tags
  notes: string;
  tags: string[];
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
  nodeStatuses = ['active', 'inactive', 'maintenance', 'decommissioned'];
  installationTypes = ['outdoor', 'indoor', 'underground', 'submerged'];
  enclosureRatings = ['IP54', 'IP65', 'IP67', 'IP68'];
  powerSources = ['solar', 'grid', 'battery', 'hybrid'];
  provinces = [
    'DKI Jakarta', 'Jawa Barat', 'Jawa Tengah', 'Jawa Timur', 'Banten',
    'Bali', 'Sumatera Utara', 'Sumatera Barat', 'Sumatera Selatan',
    'Kalimantan Timur', 'Kalimantan Selatan', 'Sulawesi Selatan', 'Papua'
  ];

  currentNodeId = '';
  isEditMode = false;
  tagsInput = '';

  form: NodeForm = {
    idProject: '',
    idNodeModel: '',
    code: '',
    name: '',
    description: '',
    serialNumber: '',
    installDate: '',
    devEui: '',
    ipAddress: '',
    firmwareVersion: '',
    batteryType: this.batteryTypes[0],
    telemetryIntervalSec: 120,
    connectivityStatus: 'unknown',
    // Location
    address: '',
    city: '',
    province: '',
    postalCode: '',
    country: 'Indonesia',
    latitude: null,
    longitude: null,
    elevationM: null,
    // Status & Maintenance
    status: 'active',
    commissionedAt: '',
    lastMaintenanceAt: '',
    nextMaintenanceAt: '',
    // Environment
    installationType: '',
    enclosureRating: '',
    powerSource: '',
    // PIC
    picName: '',
    picPhone: '',
    picEmail: '',
    // Notes & Tags
    notes: '',
    tags: []
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
        // Helper to format date for input
        const formatDate = (date: any): string => {
          if (!date) return '';
          return typeof date === 'string' ? date.substring(0, 10) : new Date(date).toISOString().substring(0, 10);
        };

        // Map node data to form
        this.form = {
          idProject: node.idProject || '',
          idNodeModel: node.idNodeModel || '',
          code: node.code || '',
          name: node.name || '',
          description: node.description || '',
          serialNumber: node.serialNumber || '',
          installDate: formatDate(node.installDate),
          devEui: node.devEui || '',
          ipAddress: node.ipAddress || '',
          firmwareVersion: node.firmwareVersion || '',
          batteryType: node.batteryType || this.batteryTypes[0],
          telemetryIntervalSec: node.telemetryIntervalSec || 120,
          connectivityStatus: node.connectivityStatus || 'unknown',
          // Location
          address: node.address || '',
          city: node.city || '',
          province: node.province || '',
          postalCode: node.postalCode || '',
          country: node.country || 'Indonesia',
          latitude: node.latitude ?? null,
          longitude: node.longitude ?? null,
          elevationM: node.elevationM ?? null,
          // Status & Maintenance
          status: node.status || 'active',
          commissionedAt: formatDate(node.commissionedAt),
          lastMaintenanceAt: formatDate(node.lastMaintenanceAt),
          nextMaintenanceAt: formatDate(node.nextMaintenanceAt),
          // Environment
          installationType: node.installationType || '',
          enclosureRating: node.enclosureRating || '',
          powerSource: node.powerSource || '',
          // PIC
          picName: node.picName || '',
          picPhone: node.picPhone || '',
          picEmail: node.picEmail || '',
          // Notes & Tags
          notes: node.notes || '',
          tags: node.tags || []
        };

        this.tagsInput = this.form.tags.join(', ');
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

  // Parse tags from comma-separated string
  onTagsChange(value: string): void {
    this.tagsInput = value;
    this.form.tags = value.split(',').map(t => t.trim()).filter(t => t.length > 0);
  }

  // Build DTO from form
  private buildNodeDto(): CreateNodeDto {
    return {
      idProject: this.form.idProject,
      idNodeModel: this.form.idNodeModel,
      code: this.form.code,
      name: this.form.name || undefined,
      description: this.form.description || undefined,
      serialNumber: this.form.serialNumber || undefined,
      installDate: this.form.installDate || undefined,
      devEui: this.form.devEui || undefined,
      ipAddress: this.form.ipAddress || undefined,
      firmwareVersion: this.form.firmwareVersion || undefined,
      batteryType: this.form.batteryType || undefined,
      telemetryIntervalSec: this.form.telemetryIntervalSec,
      connectivityStatus: this.form.connectivityStatus || undefined,
      // Location
      address: this.form.address || undefined,
      city: this.form.city || undefined,
      province: this.form.province || undefined,
      postalCode: this.form.postalCode || undefined,
      country: this.form.country || undefined,
      latitude: this.form.latitude ?? undefined,
      longitude: this.form.longitude ?? undefined,
      elevationM: this.form.elevationM ?? undefined,
      // Status & Maintenance
      status: this.form.status || undefined,
      commissionedAt: this.form.commissionedAt || undefined,
      lastMaintenanceAt: this.form.lastMaintenanceAt || undefined,
      nextMaintenanceAt: this.form.nextMaintenanceAt || undefined,
      // Environment
      installationType: this.form.installationType || undefined,
      enclosureRating: this.form.enclosureRating || undefined,
      powerSource: this.form.powerSource || undefined,
      // PIC
      picName: this.form.picName || undefined,
      picPhone: this.form.picPhone || undefined,
      picEmail: this.form.picEmail || undefined,
      // Notes & Tags
      notes: this.form.notes || undefined,
      tags: this.form.tags.length > 0 ? this.form.tags : undefined
    };
  }

  get payloadPreview(): CreateNodeDto | UpdateNodeDto {
    return this.buildNodeDto();
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

    const nodeData = this.buildNodeDto();

    if (this.isEditMode && this.currentNodeId) {
      // Update existing node
      this.nodesService.nodesControllerUpdate({
        id: this.currentNodeId,
        body: nodeData as UpdateNodeDto
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
      this.nodesService.nodesControllerCreate({
        body: nodeData
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
