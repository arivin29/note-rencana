import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FlowMeterInput, FlowMeterService, FlowMeterView, FlowQuantity } from '@services/flow-meter.service';

export { FlowMeterInput } from '@services/flow-meter.service';

@Component({
    selector: 'sensor-flow-diagram',
    templateUrl: './sensor-flow-diagram.component.html',
    styleUrls: ['./sensor-flow-diagram.component.scss'],
    standalone: false
})
export class SensorFlowDiagramComponent implements OnChanges {
    @Input() data: FlowMeterInput | null = null;
    @Input() sensorLabel = '';
    @Input() catalogLabel = '';

    /** Diminta user untuk mengisi diameter (buka drawer Context). */
    @Output() configureDiameter = new EventEmitter<void>();

    view: FlowMeterView;

    constructor(private flowMeter: FlowMeterService) {
        this.view = this.flowMeter.describe(null);
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['data']) {
            this.view = this.flowMeter.describe(this.data);
        }
    }

    onConfigureDiameter(): void {
        this.configureDiameter.emit();
    }

    get crossCheckLabel(): string {
        switch (this.view.crossCheck) {
            case 'ok': return 'Konsisten';
            case 'warning': return 'Selisih sedang';
            case 'critical': return 'Selisih besar';
            case 'idle': return 'Tidak ada aliran';
            default: return 'Belum bisa dicek';
        }
    }

    get crossCheckBadge(): string {
        switch (this.view.crossCheck) {
            case 'ok': return 'badge bg-success bg-opacity-25 text-success';
            case 'warning': return 'badge bg-warning bg-opacity-25 text-warning';
            case 'critical': return 'badge bg-danger bg-opacity-25 text-danger';
            default: return 'badge bg-inverse bg-opacity-15 text-inverse text-opacity-75';
        }
    }

    sourceLabel(source: FlowQuantity['source']): string {
        switch (source) {
            case 'measured': return 'diukur';
            case 'computed': return 'dihitung';
            case 'context': return 'context';
            case 'device': return 'alat';
            default: return '-';
        }
    }
}
