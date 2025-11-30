import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { NodeConfig, NodeModel, ExistingNode } from '../../pairing-workspace.types';
import { NodesService } from 'src/sdk/core/services';
import { ProjectsService } from '../../../../../../../sdk/core/services/projects.service';
import { NodeModelsService } from '../../../../../../../sdk/core/services/node-models.service';
import { UnpairedDeviceResponseDto } from 'src/sdk/core/models';

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
    nodeModelOptions: NodeModelOption[] = [];

    // Form dropdowns
    telemetryModes: Array<'push' | 'pull'> = ['push', 'pull'];
    batteryTypes = ['Li-SOCl2', 'Li-ion', 'AC Mains'];
    locationTypes: Array<'manual' | 'gps'> = ['manual', 'gps'];

    constructor(
        private nodesService: NodesService,
        private projectsService: ProjectsService,
        private nodeModelsService: NodeModelsService
    ) { }

    ngOnInit(): void {
        this.loadExistingNodes();
        
        // Set ownerId from unpairedDevice's suggestedOwner FIRST
        if (this.unpairedDevice && this.nodeConfig.newNode) {
            const suggestedOwnerId = this.unpairedDevice.suggestedOwner as any;
            this.nodeConfig.newNode.ownerId = typeof suggestedOwnerId === 'string' ? suggestedOwnerId : '';
        }

         
        
        // Load projects AFTER ownerId is set (so we can filter by owner)
        
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
        this.nodesService.nodesControllerFindAll({
            limit: 10,
            // connectivityStatus: 'inactive'
        }).subscribe({
            next: (response: any) => {
                response = JSON.parse(response).data;
                this.existingNodes = response as ExistingNode[];
                this.existingNodesLoading = false;
            },
            error: (err) => {
                console.error('Failed to load inactive nodes', err);
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

        const createNodeDto = {
            idProject: formData.projectId,
            idNodeModel: formData.nodeModelId,
            code: formData.code,
            serialNumber: formData.serialNumber,
            devEui: formData.devEui || undefined,
            ipAddress: formData.ipAddress || undefined,
            firmwareVersion: formData.firmwareVersion || undefined,
            batteryType: formData.batteryType || undefined,
            telemetryIntervalSec: formData.telemetryIntervalSec
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
                idOwner: ownerId  // Filter by owner
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
                        .map((model: any) => ({
                            id: model?.idNodeModel || model?.id || '',
                            vendor: model?.vendor || '',
                            model: model?.modelName || model?.model || ''
                        }))
                        .filter((model: NodeModelOption) => model.id);
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
