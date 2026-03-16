import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MlForecastsService, SensorChannelsService } from 'src/sdk/core/services';

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
  forecasts: any[] = [];
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
  
  constructor(
    private forecastsService: MlForecastsService,
    private sensorChannelsService: SensorChannelsService
  ) {}
  
  ngOnInit(): void {
    this.loadSensors();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  loadSensors(): void {
    this.isLoading = true;
    this.sensorChannelsService.sensorChannelsControllerFindAll$Response({ limit: 500 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          const data = response.body?.data || response.body || [];
          this.sensors = data.map((ch: any) => ({
            id: ch.idSensorChannel,
            label: `${ch.metricCode || ch.idSensorChannel} (${ch.sensor?.label || 'N/A'})`
          }));
          
          // Auto-select first sensor if none selected
          if (this.sensors.length > 0 && !this.selectedSensorId) {
            this.selectedSensorId = this.sensors[0].id;
            this.loadForecasts();
          } else {
            this.isLoading = false;
          }
        },
        error: (err) => {
          console.error('Failed to load sensors:', err);
          this.isLoading = false;
        }
      });
  }
  
  loadForecasts(): void {
    if (!this.selectedSensorId) {
      this.isLoading = false;
      return;
    }
    
    this.isLoading = true;
    
    const params: any = {
      limit: 500,
      idSensorChannel: this.selectedSensorId
    };
    
    this.forecastsService.forecastsControllerFindAll$Response(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          const data = response.body?.data || response.body || [];
          this.forecasts = data;
          this.updateChart(data);
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Failed to load forecasts:', err);
          this.isLoading = false;
        }
      });
  }
  
  onSensorChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedSensorId = select.value;
    this.loadForecasts();
  }
  
  updateChart(data: any[]): void {
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
    const sensorChannel = sorted[0]?.sensorChannel;
    const unit = sensorChannel?.unitMeasure || '';
    
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
    this.loadSensors();
  }
}
