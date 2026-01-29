import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { NodeConfig, NodeModel, ExistingNode } from '../../pairing-workspace.types';
import { NodesService } from 'src/sdk/core/services';
import { ProjectsService } from '../../../../../../../sdk/core/services/projects.service';
import { NodeModelsService } from '../../../../../../../sdk/core/services/node-models.service';
import { OwnersService } from '../../../../../../../sdk/core/services/owners.service';
import { NodeModelResponseDto, UnpairedDeviceResponseDto } from 'src/sdk/core/models';
import { AuthService } from '../../../../../../services/auth.service';

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

interface OwnerOption {
    id: string;
    code: string;
    name: string;
    status: string;
}

@Component({
    selector: 'pw-step-node-config',
    templateUrl: './step-node-config.component.html',
    styleUrls: ['./step-node-config.component.scss'],
    standalone: false
})
export class StepNodeConfigComponent implements OnInit {
    @Input() nodeConfig!: NodeConfig;
    @Input() nodeModels: NodeModel[] = [];
    @Input() unpairedDevice?: UnpairedDeviceResponseDto | null;

    @Output() configChange = new EventEmitter<NodeConfig>();
    @Output() validationChange = new EventEmitter<boolean>();
    @Output() selectNode = new EventEmitter;

    existingNodes: ExistingNode[] = [];
    existingNodesLoading = false;

    // Dropdown options
    projectOptionsAll: ProjectOption[] = [];
    nodeModelOptions: NodeModelResponseDto[] = [];
    ownerOptions: OwnerOption[] = [];  // For HELIO devices (admin only)

    // Form dropdowns
    telemetryModes: Array<'push' | 'pull'> = ['push', 'pull'];
    batteryTypes = ['Li-SOCl2', 'Li-ion', 'AC Mains', 'Solar'];
    nodeStatuses = ['active', 'inactive', 'maintenance'];
    installationTypes = ['outdoor', 'indoor', 'underground', 'submerged'];
    enclosureRatings = ['IP54', 'IP65', 'IP67', 'IP68'];
    powerSources = ['solar', 'grid', 'battery', 'hybrid'];
    provinces = [
        'DKI Jakarta', 'Jawa Barat', 'Jawa Tengah', 'Jawa Timur', 'Banten',
        'Bali', 'Sumatera Utara', 'Sumatera Barat', 'Sumatera Selatan',
        'Kalimantan Timur', 'Kalimantan Selatan', 'Sulawesi Selatan', 'Papua'
    ];

    // HELIO device detection
    isHelioDevice = false;
    currentUserRole = '';
    ownerFieldEnabled = false;

    constructor(
        private nodesService: NodesService,
        private projectsService: ProjectsService,
        private nodeModelsService: NodeModelsService,
        private ownersService: OwnersService,
        private authService: AuthService
    ) { }

    ngOnInit(): void {
        this.loadExistingNodes();
        
        // Get current user role
        this.currentUserRole = this.authService.getCurrentUserRole();
        
        // Check if this is a HELIO device
        if (this.unpairedDevice && this.unpairedDevice.hardwareId) {
            this.isHelioDevice = this.unpairedDevice.hardwareId.toUpperCase().startsWith('HELIO-');
        }
        
        // HELIO device logic for ADMIN
        if (this.isHelioDevice && this.isAdmin()) {
            console.log('🔒 HELIO Device detected - Admin access enabled');
            this.ownerFieldEnabled = true;
            this.loadAllOwners();  // Load all owners for admin to choose
            
            // Do NOT set ownerId from suggestedOwner - let admin choose manually
            if (this.nodeConfig.newNode) {
                this.nodeConfig.newNode.ownerId = '';  // Reset to empty
            }
        } 
        // Regular device or non-admin: Use suggested owner
        else {
            this.ownerFieldEnabled = false;
            
            // Set ownerId from unpairedDevice's suggestedOwner
            if (this.unpairedDevice && this.nodeConfig.newNode) {
                const suggestedOwnerId = this.unpairedDevice.suggestedOwner as any;
                this.nodeConfig.newNode.ownerId = typeof suggestedOwnerId === 'string' ? suggestedOwnerId : '';
                
                // Load projects for this owner
                this.loadProjectOptions();
                this.loadNodeModelOptions();
            }
        }
    }

    /**
     * Check if current user is admin
     */
    isAdmin(): boolean {
        return this.currentUserRole === 'admin' || this.currentUserRole === 'ADMIN';
    }

    /**
     * Load all owners (for HELIO devices - admin only)
     */
    private loadAllOwners(): void {
        console.log('🔄 Loading all owners for HELIO device...');
        this.ownersService
            .ownersControllerFindAll({ 
                page: 1, 
                limit: 200
                // No owner filter - get all owners
            })
            .subscribe({
                next: (response: any) => {
                    console.log('✅ Owners response received:', response);
                    
                    // Parse response (might be string or object)
                    const parsed = typeof response === 'string' ? JSON.parse(response) : response;
                    console.log('📦 Parsed response:', parsed);
                    
                    // Extract data array
                    const items = parsed?.data || parsed?.items || (Array.isArray(parsed) ? parsed : []);
                    console.log('📋 Extracted items:', items.length);
                    
                    this.ownerOptions = items
                        .map((owner: any) => ({
                            id: owner?.idOwner || owner?.id || '',
                            code: owner?.code || '',
                            name: owner?.name || 'Owner',
                            status: owner?.status || 'active'
                        }))
                        .filter((owner: OwnerOption) => owner.id && owner.status === 'active');  // Only active owners
                    
                    console.log('✅ Loaded owners for HELIO device:', this.ownerOptions.length, this.ownerOptions);
                },
                error: (error) => {
                    console.error('❌ Failed to load owners:', error);
                }
            });
    }

    /**
     * Handle owner selection change (for HELIO devices)
     */
    onOwnerChange(ownerId: string): void {
        console.log('Owner changed to:', ownerId);
        
        // Set the ownerId in newNode config
        if (this.nodeConfig.newNode) {
            this.nodeConfig.newNode.ownerId = ownerId;
        }
        
        // Clear project selection
        if (this.nodeConfig.newNode) {
            this.nodeConfig.newNode.projectId = '';
        }
        
        // Reload projects for selected owner
        this.loadProjectOptions();
        this.loadNodeModelOptions();
        
        this.emitChanges();
    }

    ngOnChanges(changes: SimpleChanges): void {
        //Called before any other lifecycle hook. Use it to inject dependencies, but avoid any serious work here.
        //Add '${implements OnChanges}' to the class.
        if (changes['unpairedDevice'] && this.unpairedDevice && this.nodeConfig.newNode) {
            const suggestedOwnerId = this.unpairedDevice.suggestedOwner as any;
            this.nodeConfig.newNode.ownerId = typeof suggestedOwnerId === 'string' ? suggestedOwnerId : '';
            console.log('Updated ownerId from unpairedDevice:', this.unpairedDevice);

            this.loadProjectOptions();
            this.loadNodeModelOptions();

            this.emitValidation();
        }   
    }

    private loadExistingNodes(): void {
        this.existingNodesLoading = true;
        
        // Build query params
        const params: any = {
            limit: 100,
            idNodeProfileIsNull: true  // Only nodes without node profile (unpaired)
        };
        
        // Filter by ownerId if not admin (admin sees all)
        if (!this.isAdmin()) {
            const ownerId = this.authService.getCurrentOwnerId();
            if (ownerId) {
                params.ownerId = ownerId;
            }
        }
        
        this.nodesService.nodesControllerFindAll(params).subscribe({
            next: (response: any) => {
                response = JSON.parse(response).data;
                this.existingNodes = response as ExistingNode[];
                this.existingNodesLoading = false;
            },
            error: (err) => {
                console.error('Failed to load unpaired nodes', err);
                this.existingNodes = [];
                this.existingNodesLoading = false;
            }
        });
    }

    selectMode(mode: 'existing' | 'new'): void {
        this.nodeConfig.mode = mode;
        this.emitChanges();
    }

    selectExistingNode(node: ExistingNode): void {
        this.nodeConfig.selectedExistingNode = node;
        this.selectNode.emit(node.idNode);
        console.log('Selected existing node ID:', node.idNode);
        this.emitChanges();
    }

    createNewNode(): void {
        if (!this.isStepValid()) {
            console.error('Form is invalid');
            return;
        }

        const formData = this.nodeConfig.newNode;
        if (!formData || !formData.projectId) {
            console.error('Project ID is required');
            alert('Please select a project before creating the node.');
            return;
        }

        const createNodeDto: any = {
            idProject: formData.projectId,
            idNodeModel: formData.nodeModelId,
            code: formData.code,
            name: formData.name || undefined,
            description: formData.description || undefined,
            serialNumber: formData.serialNumber,
            devEui: formData.devEui || undefined,
            ipAddress: formData.ipAddress || undefined,
            firmwareVersion: formData.firmwareVersion || undefined,
            batteryType: formData.batteryType || undefined,
            telemetryIntervalSec: formData.telemetryIntervalSec,
            // Location fields
            address: formData.address || undefined,
            city: formData.city || undefined,
            province: formData.province || undefined,
            postalCode: formData.postalCode || undefined,
            country: formData.country || 'Indonesia',
            latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
            longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
            elevationM: formData.elevationM ? parseFloat(formData.elevationM) : undefined,
            // Status & Environment
            status: formData.status || 'active',
            installationType: formData.installationType || undefined,
            enclosureRating: formData.enclosureRating || undefined,
            powerSource: formData.powerSource || undefined,
            // PIC
            picName: formData.picName || undefined,
            picPhone: formData.picPhone || undefined,
            picEmail: formData.picEmail || undefined,
            // Notes
            notes: formData.notes || undefined
        };

        this.nodesService.nodesControllerCreate({
            body: createNodeDto
        }).subscribe({
            next: (response: any) => {
                const createdNode = typeof response === 'string' ? JSON.parse(response) : response;
                const nodeId = createdNode?.idNode || createdNode?.id;
                
                console.log('Node created successfully:', nodeId);
                this.selectNode.emit(nodeId);
                this.emitChanges();
            },
            error: (error) => {
                console.error('Failed to create node', error);
                alert('Failed to create node. Please check the form and try again.');
            }
        });
    }

    private emitChanges(): void {
        this.configChange.emit(this.nodeConfig);
        this.emitValidation();
    }

    private emitValidation(): void {
        const isValid = this.isStepValid();
        this.validationChange.emit(isValid);
    }

    private isStepValid(): boolean {
        if (this.nodeConfig.mode === 'existing') {
            return !!this.nodeConfig.selectedExistingNode;
        } else {
            return !!(
                this.nodeConfig.newNode?.projectId &&
                this.nodeConfig.newNode?.nodeModelId &&
                this.nodeConfig.newNode?.code &&
                this.nodeConfig.newNode?.serialNumber
            );
        }
    }

    // Trigger validation when form changes
    onFormChange(): void {
        this.emitChanges();
    }

    get projectOptions(): ProjectOption[] {
        const ownerId = this.nodeConfig.newNode?.ownerId;
        if (!ownerId) {
            return [];
        }
        return this.projectOptionsAll.filter(
            project => project.ownerId === ownerId
        );
    }

    get suggestedOwnerName(): string {
        if (!this.unpairedDevice) return '';
        const ownerName = this.unpairedDevice.suggestedOwnerName as any;
        return typeof ownerName === 'string' ? ownerName : '';
    }

    private loadProjectOptions(): void {
        // Get ownerId from unpaired device
        const ownerId = this.nodeConfig.newNode?.ownerId;
        
        if (!ownerId) {
            console.warn('No owner ID available to load projects');
            return;
        }

        this.projectsService
            .projectsControllerFindAll$Response({ 
                page: 1, 
                limit: 200,
                ownerId: ownerId  // Filter by owner
            })
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
                    
                    // Auto-select suggested project if available
                    if (this.unpairedDevice && this.nodeConfig.newNode) {
                        const suggestedProjectId = this.unpairedDevice.suggestedProject as any;
                        const projectId = typeof suggestedProjectId === 'string' ? suggestedProjectId : '';
                        
                        // Verify the project exists in the list
                        if (projectId && this.projectOptionsAll.some(p => p.id === projectId)) {
                            this.nodeConfig.newNode.projectId = projectId;
                        } else if (this.projectOptionsAll.length > 0) {
                            // If suggested project not found, select first available
                            this.nodeConfig.newNode.projectId = this.projectOptionsAll[0].id;
                        }
                        this.emitChanges();
                    }
                },
                error: (error) => {
                    console.error('Failed to load projects', error);
                }
            });
    }

    private loadNodeModelOptions(): void {
        this.nodeModelsService
            .nodeModelsControllerFindAll$Response({ page: 1, limit: 100 })
            .subscribe({
                next: (response) => {
                    const body = this.parseBody(response.body);
                    const items = this.extractDataArray(body);
                    this.nodeModelOptions = items
                         
                },
                error: (error) => {
                    console.error('Failed to load node models', error);
                }
            });
    }

    private parseBody(body: unknown): any {
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
