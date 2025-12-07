import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CreateNodeModelDto, UpdateNodeModelDto, NodeModelResponseDto } from 'src/sdk/core/models';

// Temporary interface for form
interface NodeModelForm {
    modelCode?: string;
    vendor: string;
    modelName: string;
    protocol: string;
    communicationBand?: string;
    powerType?: string;
    hardwareClass?: 'mcu' | 'gateway' | 'tracker' | 'custom';
    toolchain?: string;
    buildAgent?: string;
    firmwareRepo?: string;
    flashProtocol?: string;
    supportsCodegen: boolean;
    defaultFirmware?: string;
}

@Component({
    selector: 'app-node-model-drawer',
    templateUrl: './node-model-drawer.component.html',
    styleUrls: ['./node-model-drawer.component.scss'],
    standalone: false
})
export class NodeModelDrawerComponent implements OnChanges {
    @Input() isOpen = false;
    @Input() mode: 'create' | 'edit' = 'create';
    @Input() existingModel?: NodeModelResponseDto;
    @Input() hardwareClassOptions: Array<{ label: string; value: 'mcu' | 'gateway' | 'tracker' | 'custom' }> = [];
    @Output() save = new EventEmitter<CreateNodeModelDto | UpdateNodeModelDto>();
    @Output() close = new EventEmitter<void>();

    formModel: NodeModelForm = this.createEmptyNodeModel();

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['isOpen'] && this.isOpen) {
            if (this.mode === 'edit' && this.existingModel) {
                this.formModel = this.mapModelToForm(this.existingModel);
            } else {
                this.formModel = this.createEmptyNodeModel();
            }
        }
    }

    get drawerTitle(): string {
        return this.mode === 'edit' ? 'Edit Node Model' : 'Add Node Model';
    }

    get submitButtonLabel(): string {
        return this.mode === 'edit' ? 'Update Model' : 'Save Model';
    }

    handleBackdropClick() {
        this.close.emit();
    }

    handleCloseClick(event: MouseEvent) {
        event.preventDefault();
        this.close.emit();
    }

    handleSubmit(formValid: boolean) {
        if (!formValid) {
            return;
        }
        
        if (this.mode === 'edit') {
            // For update, emit UpdateNodeModelDto
            const dto: UpdateNodeModelDto = {
                vendor: this.formModel.vendor,
                modelName: this.formModel.modelName,
                protocol: this.formModel.protocol,
                communicationBand: this.formModel.communicationBand,
                powerType: this.formModel.powerType,
                hardwareClass: this.formModel.hardwareClass,
                toolchain: this.formModel.toolchain,
                buildAgent: this.formModel.buildAgent,
                firmwareRepo: this.formModel.firmwareRepo,
                flashProtocol: this.formModel.flashProtocol,
                supportsCodegen: this.formModel.supportsCodegen,
                defaultFirmware: this.formModel.defaultFirmware
            };
            this.save.emit(dto);
        } else {
            // For create, emit CreateNodeModelDto
            const dto: CreateNodeModelDto = {
                modelCode: this.formModel.modelCode,
                vendor: this.formModel.vendor,
                modelName: this.formModel.modelName,
                protocol: this.formModel.protocol,
                communicationBand: this.formModel.communicationBand,
                powerType: this.formModel.powerType,
                hardwareClass: this.formModel.hardwareClass,
                toolchain: this.formModel.toolchain,
                buildAgent: this.formModel.buildAgent,
                firmwareRepo: this.formModel.firmwareRepo,
                flashProtocol: this.formModel.flashProtocol,
                supportsCodegen: this.formModel.supportsCodegen,
                defaultFirmware: this.formModel.defaultFirmware
            };
            this.save.emit(dto);
        }
    }

    private createEmptyNodeModel(): NodeModelForm {
        return {
            modelCode: '',
            vendor: '',
            modelName: '',
            protocol: '',
            communicationBand: '',
            powerType: '',
            hardwareClass: 'mcu',
            toolchain: '',
            buildAgent: '',
            firmwareRepo: '',
            flashProtocol: '',
            supportsCodegen: false,
            defaultFirmware: ''
        };
    }

    private mapModelToForm(model: NodeModelResponseDto): NodeModelForm {
        return {
            modelCode: model.modelCode,
            vendor: model.vendor,
            modelName: model.modelName,
            protocol: model.protocol || '',
            communicationBand: model.communicationBand || '',
            powerType: model.powerType || '',
            hardwareClass: model.hardwareClass,
            toolchain: model.toolchain || '',
            buildAgent: model.buildAgent || '',
            firmwareRepo: model.firmwareRepo || '',
            flashProtocol: model.flashProtocol || '',
            supportsCodegen: model.supportsCodegen || false,
            defaultFirmware: model.defaultFirmware || ''
        };
    }
}
