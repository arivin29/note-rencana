import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NodeModelsService } from 'src/sdk/core/services';
import { NodeModelResponseDto, CreateNodeModelDto, UpdateNodeModelDto } from 'src/sdk/core/models';

@Component({
    selector: 'app-node-models',
    templateUrl: './node-models.html',
    styleUrls: ['./node-models.scss'],
    standalone: false
})
export class NodeModelsPage implements OnInit {
    nodeModelSearch = '';
    isDrawerOpen = false;
    drawerMode: 'create' | 'edit' = 'create';
    selectedModel?: NodeModelResponseDto;
    loading = false;
    errorMessage = '';

    hardwareClassOptions: Array<{ label: string; value: NonNullable<NodeModelResponseDto['hardwareClass']> }> = [
        { label: 'MCU / DevKit', value: 'mcu' },
        { label: 'Gateway', value: 'gateway' },
        { label: 'Tracker', value: 'tracker' },
        { label: 'Custom', value: 'custom' }
    ];

    nodeModels: NodeModelResponseDto[] = [];

    constructor(
        private router: Router, 
        private route: ActivatedRoute,
        private nodeModelsService: NodeModelsService
    ) { }

    ngOnInit(): void {
        this.loadNodeModels();
    }

    loadNodeModels(): void {
        this.loading = true;
        this.errorMessage = '';
        
        this.nodeModelsService.nodeModelsControllerFindAll({}).subscribe({
            next: (response: any) => {
                // Parse if response is string
                const parsed = typeof response === 'string' ? JSON.parse(response) : response;
                this.nodeModels = parsed.data || parsed || [];
                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading node models:', err);
                this.errorMessage = err.message || 'Failed to load node models';
                this.loading = false;
            }
        });
    }

    get stats() {
        return {
            total: this.nodeModels.length,
            codegenSupported: this.nodeModels.filter((m) => m.supportsCodegen).length
        };
    }

    get filteredNodeModels() {
        const term = this.nodeModelSearch.trim().toLowerCase();
        if (!term) {
            return this.nodeModels;
        }
        return this.nodeModels.filter((model) =>
            model.modelCode?.toLowerCase().includes(term) ||
            model.vendor.toLowerCase().includes(term) ||
            model.modelName.toLowerCase().includes(term) ||
            (model.toolchain ?? '').toLowerCase().includes(term)
        );
    }

    openDrawer() {
        this.drawerMode = 'create';
        this.selectedModel = undefined;
        this.isDrawerOpen = true;
    }

    openDrawerForEdit(model: NodeModelResponseDto) {
        this.drawerMode = 'edit';
        this.selectedModel = model;
        this.isDrawerOpen = true;
    }

    closeDrawer() {
        this.isDrawerOpen = false;
        this.selectedModel = undefined;
    }

    handleDrawerSave(dto: CreateNodeModelDto | UpdateNodeModelDto) {
        this.loading = true;
        this.errorMessage = '';

        if (this.drawerMode === 'edit' && this.selectedModel?.idNodeModel) {
            // Update existing model
            this.nodeModelsService.nodeModelsControllerUpdate({
                id: this.selectedModel.idNodeModel,
                body: dto as UpdateNodeModelDto
            }).subscribe({
                next: (response: any) => {
                    console.log('Node model updated:', response);
                    this.loadNodeModels();
                    this.closeDrawer();
                    this.loading = false;
                },
                error: (err) => {
                    console.error('Error updating node model:', err);
                    this.errorMessage = err.message || 'Failed to update node model';
                    this.loading = false;
                }
            });
        } else {
            // Create new model
            this.nodeModelsService.nodeModelsControllerCreate({ 
                body: dto as CreateNodeModelDto 
            }).subscribe({
                next: (response: any) => {
                    console.log('Node model created:', response);
                    this.loadNodeModels();
                    this.closeDrawer();
                    this.loading = false;
                },
                error: (err) => {
                    console.error('Error creating node model:', err);
                    this.errorMessage = err.message || 'Failed to create node model';
                    this.loading = false;
                }
            });
        }
    }

    navigateToModel(model: NodeModelResponseDto) {
        if (!model.idNodeModel) {
            return;
        }
        this.router.navigate([model.idNodeModel], { relativeTo: this.route });
    }
}
