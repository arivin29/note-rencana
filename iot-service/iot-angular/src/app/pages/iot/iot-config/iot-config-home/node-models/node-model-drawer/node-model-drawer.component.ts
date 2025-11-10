import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { NodeModel } from '../../../../../../models/iot/report-node-model';

@Component({
    selector: 'app-node-model-drawer',
    templateUrl: './node-model-drawer.component.html',
    styleUrls: ['./node-model-drawer.component.scss'],
    standalone: false
})
export class NodeModelDrawerComponent implements OnChanges {
    @Input() isOpen = false;
    @Input() hardwareClassOptions: Array<{ label: string; value: NonNullable<NodeModel['hardwareClass']> }> = [];
    @Output() save = new EventEmitter<NodeModel>();
    @Output() close = new EventEmitter<void>();

    formModel: NodeModel = this.createEmptyNodeModel();

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['isOpen'] && this.isOpen) {
            this.formModel = this.createEmptyNodeModel();
        }
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
        this.save.emit({ ...this.formModel });
    }

    private createEmptyNodeModel(): NodeModel {
        return {
            idNodeModel: '',
            modelCode: '',
            vendor: '',
            modelName: '',
            protocol: '',
            communicationBand: '',
            powerType: '',
            hardwareClass: 'mcu',
            hardwareRevision: '',
            toolchain: '',
            buildAgent: '',
            firmwareRepo: '',
            flashProtocol: '',
            supportsCodegen: false,
            defaultFirmware: ''
        };
    }
}
