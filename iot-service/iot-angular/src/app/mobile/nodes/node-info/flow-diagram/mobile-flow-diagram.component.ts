import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FlowMeterInput, FlowMeterService, FlowMeterView, FlowQuantity } from '@services/flow-meter.service';

/** Diagram hidrolika pipa versi mobile — logika sama dgn desktop, tampilan m-*. */
@Component({
  selector: 'mobile-flow-diagram',
  templateUrl: './mobile-flow-diagram.component.html',
  standalone: false
})
export class MobileFlowDiagramComponent implements OnChanges {
  @Input() data: FlowMeterInput | null = null;
  @Input() sensorLabel = '';
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

  get crossCheckLabel(): string {
    switch (this.view.crossCheck) {
      case 'ok': return 'Konsisten';
      case 'warning': return 'Selisih sedang';
      case 'critical': return 'Selisih besar';
      case 'idle': return 'Tidak ada aliran';
      default: return 'Belum bisa dicek';
    }
  }

  get crossCheckClass(): string {
    switch (this.view.crossCheck) {
      case 'ok': return 'm-pill m-pill--ok';
      case 'warning': return 'm-pill m-pill--warn';
      case 'critical': return 'm-pill m-pill--danger';
      default: return 'm-pill m-pill--off';
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
