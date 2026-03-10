import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MlService, ForecastResponse, ForecastQueryParams } from '../ml.service';

import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexYAxis,
  ApexDataLabels,
  ApexStroke,
  ApexFill,
  ApexTooltip,
  ApexLegend,
  ChartComponent
} from 'ng-apexcharts';

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  dataLabels: ApexDataLabels;
  stroke: ApexStroke;
  fill: ApexFill;
  tooltip: ApexTooltip;
  legend: ApexLegend;
};

@Component({
  selector: 'forecasts-view',
  templateUrl: './forecasts-view.html',
  styleUrls: ['./forecasts-view.scss'],
  standalone: false
})
export class ForecastsViewComponent implements OnInit, OnDestroy {
  @ViewChild('chart') chart!: ChartComponent;
  
  private destroy$ = new Subject<void>();
  
  isLoading = true;
  forecasts: ForecastResponse[] = [];
  selectedSensorId = '';
  sensors: Array<{ id: string; label: string }> = [];
  
  // Chart options
  chartOptions: Partial<ChartOptions> = {
    series: [],
    chart: {
      type: 'line',
      height: 400,
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true
        }
      },
      animations: {
        enabled: true,
        speed: 800
      }
    },
    xaxis: {
      type: 'datetime',
      labels: {
        datetimeFormatter: {
          year: 'yyyy',
          month: "MMM 'yy",
          day: 'dd MMM',
          hour: 'HH:mm'
        }
      }
    },
    yaxis: {
      labels: {
        formatter: (val: number) => val.toFixed(2)
      }
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth',
      width: [2, 1, 1]
    },
    fill: {
      type: 'solid',
      opacity: [1, 0.3, 0.3]
    },
    tooltip: {
      shared: true,
      x: {
        format: 'dd MMM yyyy HH:mm'
      }
    },
    legend: {
      position: 'top',
      horizontalAlign: 'left'
    }
  };
  
  constructor(private mlService: MlService) {}
  
  ngOnInit(): void {
    this.loadForecasts();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  loadForecasts(): void {
    this.isLoading = true;
    
    const params: ForecastQueryParams = {
      limit: 500
    };
    
    if (this.selectedSensorId) {
      params.idSensorChannel = this.selectedSensorId;
    }
    
    this.mlService.getForecasts(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.forecasts = data;
          this.extractSensors(data);
          this.updateChart(data);
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Failed to load forecasts:', err);
          this.isLoading = false;
        }
      });
  }
  
  extractSensors(data: ForecastResponse[]): void {
    const sensorMap = new Map<string, string>();
    data.forEach(f => {
      if (!sensorMap.has(f.idSensorChannel)) {
        sensorMap.set(f.idSensorChannel, f.sensorInfo?.metricCode || f.idSensorChannel);
      }
    });
    
    this.sensors = Array.from(sensorMap.entries()).map(([id, label]) => ({ id, label }));
    
    // Auto-select first sensor if none selected
    if (!this.selectedSensorId && this.sensors.length > 0) {
      this.selectedSensorId = this.sensors[0].id;
      this.filterBySensor();
    }
  }
  
  filterBySensor(): void {
    const filtered = this.forecasts.filter(f => f.idSensorChannel === this.selectedSensorId);
    this.updateChart(filtered);
  }
  
  onSensorChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedSensorId = select.value;
    this.filterBySensor();
  }
  
  updateChart(data: ForecastResponse[]): void {
    if (data.length === 0) {
      this.chartOptions.series = [];
      return;
    }
    
    // Sort by time
    const sorted = [...data].sort((a, b) => 
      new Date(a.forecastTime).getTime() - new Date(b.forecastTime).getTime()
    );
    
    // Prepare series data
    const forecastData = sorted.map(f => ({
      x: new Date(f.forecastTime).getTime(),
      y: f.forecastValue
    }));
    
    const upperBoundData = sorted.map(f => ({
      x: new Date(f.forecastTime).getTime(),
      y: f.upperBound
    }));
    
    const lowerBoundData = sorted.map(f => ({
      x: new Date(f.forecastTime).getTime(),
      y: f.lowerBound
    }));
    
    // Get sensor info
    const sensorInfo = sorted[0]?.sensorInfo;
    const unit = sensorInfo?.unit || '';
    
    this.chartOptions = {
      ...this.chartOptions,
      series: [
        {
          name: 'Prakiraan',
          data: forecastData
        },
        {
          name: 'Batas Atas',
          data: upperBoundData
        },
        {
          name: 'Batas Bawah',
          data: lowerBoundData
        }
      ],
      yaxis: {
        ...this.chartOptions.yaxis,
        title: {
          text: unit
        }
      }
    };
  }
  
  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  getConfidenceClass(confidence: number): string {
    if (confidence >= 0.9) return 'text-success';
    if (confidence >= 0.7) return 'text-warning';
    return 'text-danger';
  }
  
  refreshData(): void {
    this.loadForecasts();
  }
}
