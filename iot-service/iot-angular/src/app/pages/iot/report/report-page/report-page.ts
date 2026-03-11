import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ChartComponent, ApexAxisChartSeries, ApexChart, ApexXAxis, ApexYAxis, ApexTooltip, ApexStroke, ApexLegend } from 'ng-apexcharts';
import { ProjectsService, NodesService, SensorChannelsService, ReportsService } from 'src/sdk/core/services';
import { AuthService } from '../../../../services/auth.service';
import { environment } from 'src/environments/environment';
import { Workbook } from 'exceljs';
import { saveAs } from 'file-saver';

// Aggregation modes
const AggregationModes = [
  { value: 'raw', label: 'Raw Data' },
  { value: '1m', label: 'Per 1 Menit' },
  { value: '10m', label: 'Per 10 Menit' },
  { value: '1h', label: 'Per 1 Jam' },
  { value: '1d', label: 'Per 1 Hari' },
];

// Range types
const RangeTypes = [
  { value: '1d', label: '24 Jam Terakhir' },
  { value: '1w', label: '7 Hari Terakhir' },
  { value: '1M', label: '30 Hari Terakhir' },
  { value: 'custom', label: 'Rentang Kustom' },
];

interface SensorChannel {
  id: string;
  label: string;
  unit?: string;
}
interface ReportColumn {
  field: string;
  key?: string;
  label: string;
  unit?: string;
}

interface ReportRow {
  timestamp: string;
  [key: string]: any;
}

interface ChartData {
  categories: string[];
  series: { name: string; data: (number | null)[] }[];
}

interface SensorSummary {
  sensorChannelId: string;
  label: string;
  unit?: string;
  min: number;
  max: number;
  avg: number;
  count: number;
}

interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  config: {
    projectId?: string;
    nodeIds?: string[];
    sensorChannelIds: string[];
    rangeType: string;
    aggregation: string;
    fillGaps?: boolean;
  };
}

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  tooltip: ApexTooltip;
  stroke: ApexStroke;
  legend: ApexLegend;
};

@Component({
  selector: 'app-report-page',
  templateUrl: './report-page.html',
  standalone: false,
})
export class ReportPage implements OnInit {
  @ViewChild('chart') chart!: ChartComponent;

  // Form
  filterForm!: FormGroup;
  aggregationModes = AggregationModes;
  rangeTypes = RangeTypes;

  // Data
  projects: any[] = [];
  nodes: any[] = [];
  sensorChannels: SensorChannel[] = [];
  templates: ReportTemplate[] = [];

  // Preview data
  previewColumns: ReportColumn[] = [];
  previewRows: ReportRow[] = [];
  previewSummary: SensorSummary[] = [];
  chartOptions: ChartOptions = this.getDefaultChartOptions();
  showChart = false;

  // State
  loading = false;
  loadingPreview = false;
  exporting = false;
  selectedTemplate: ReportTemplate | null = null;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private projectsService: ProjectsService,
    private nodesService: NodesService,
    private sensorChannelsService: SensorChannelsService,
    private reportsService: ReportsService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadProjects();
    this.loadTemplates();
  }

  private getDefaultChartOptions(): ChartOptions {
    return {
      series: [],
      chart: { 
        type: 'line', 
        height: 350, 
        toolbar: { show: true }, 
        zoom: { enabled: true },
        foreColor: '#ffffff'
      },
      xaxis: { 
        categories: [],
        labels: {
          style: {
            colors: '#ffffff'
          }
        }
      },
      yaxis: {
        labels: {
          style: {
            colors: '#ffffff'
          }
        }
      },
      tooltip: {},
      stroke: { curve: 'smooth', width: 2 },
      legend: { 
        position: 'top',
        labels: {
          colors: '#ffffff'
        }
      },
    };
  }

  initForm(): void {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    this.filterForm = this.fb.group({
      projectId: [''],
      nodeIds: [[]],
      sensorChannelIds: [[], Validators.required],
      rangeType: ['1d'],
      startDate: [yesterday.toISOString().split('T')[0]],
      endDate: [now.toISOString().split('T')[0]],
      aggregation: ['1h', Validators.required],
      fillGaps: [false], // Default: abaikan waktu kosong
    });

    // Listen for project changes
    this.filterForm.get('projectId')?.valueChanges.subscribe((projectId) => {
      this.onProjectChange(projectId);
    });

    // Listen for node changes
    this.filterForm.get('nodeIds')?.valueChanges.subscribe((nodeIds) => {
      this.onNodesChange(nodeIds);
    });

    // Listen for range type changes
    this.filterForm.get('rangeType')?.valueChanges.subscribe((rangeType) => {
      this.updateDateRangeFromType(rangeType);
    });
  }

  loadProjects(): void {
    this.loading = true;
    const params: any = { page: 1, limit: 100 };
    this.projectsService.projectsControllerFindAll(params).subscribe({
      next: (response: any) => {
        const data = typeof response === 'string' ? JSON.parse(response) : response;
        this.projects = data.data || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load projects', err);
        this.loading = false;
      },
    });
  }

  loadNodes(projectId: string): void {
    this.loading = true;
    const params: any = { idProject: projectId, page: 1, limit: 100 };
    this.nodesService.nodesControllerFindAll(params).subscribe({
      next: (response: any) => {
        const data = typeof response === 'string' ? JSON.parse(response) : response;
        this.nodes = data.data || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load nodes', err);
        this.loading = false;
      },
    });
  }

  loadSensorChannels(nodeIds: string[]): void {
    if (!nodeIds || nodeIds.length === 0) {
      this.sensorChannels = [];
      return;
    }
    this.loading = true;
    // Load sensor channels filtered by node
    const params: any = { idNode: nodeIds[0], page: 1, limit: 100 };
    this.sensorChannelsService.sensorChannelsControllerFindAll(params).subscribe({
      next: (response: any) => {
        const data = typeof response === 'string' ? JSON.parse(response) : response;
        const channels = data.data || [];
        this.sensorChannels = channels.map((ch: any) => {
          // Build proper label from sensor.label + metricCode
          const sensorLabel = ch.sensor?.label || '';
          const metricCode = ch.metricCode || '';
          let label = '';
          if (sensorLabel && metricCode) {
            label = `${sensorLabel} - ${metricCode}`;
          } else if (sensorLabel) {
            label = sensorLabel;
          } else if (metricCode) {
            label = metricCode;
          } else {
            label = ch.idSensorChannel;
          }
          return {
            id: ch.idSensorChannel,
            label,
            unit: ch.unit,
          };
        });
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load sensor channels', err);
        this.loading = false;
      },
    });
  }

  loadTemplates(): void {
    this.reportsService.reportControllerGetTemplates().subscribe({
      next: (response: any) => {
        const templates = typeof response === 'string' ? JSON.parse(response) : response;
        this.templates = (templates || []) as ReportTemplate[];
      },
      error: (err) => {
        console.error('Failed to load templates', err);
      },
    });
  }

  onProjectChange(projectId: string): void {
    if (projectId) {
      this.loadNodes(projectId);
    } else {
      this.nodes = [];
    }
    this.filterForm.patchValue({ nodeIds: [], sensorChannelIds: [] });
  }

  onNodesChange(nodeIds: string[]): void {
    if (nodeIds?.length > 0) {
      this.loadSensorChannels(nodeIds);
    } else {
      this.sensorChannels = [];
    }
    this.filterForm.patchValue({ sensorChannelIds: [] });
  }

  updateDateRangeFromType(rangeType: string): void {
    const now = new Date();
    let startDate: Date;

    switch (rangeType) {
      case '1d':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '1w':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '1M':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        return; // Custom - don't update
    }

    this.filterForm.patchValue({
      startDate: startDate.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
    });
  }

  isCustomRange(): boolean {
    return this.filterForm.get('rangeType')?.value === 'custom';
  }

  async generatePreview(): Promise<void> {
    if (this.filterForm.invalid) {
      alert('Error: Silakan pilih minimal satu sensor channel');
      return;
    }

    this.loadingPreview = true;
    this.showChart = false;

    try {
      const formValue = this.filterForm.value;
      const request = {
        projectId: formValue.projectId || undefined,
        nodeIds: formValue.nodeIds?.length > 0 ? formValue.nodeIds : undefined,
        sensorChannelIds: formValue.sensorChannelIds,
        startDate: `${formValue.startDate}T00:00:00Z`,
        endDate: `${formValue.endDate}T23:59:59Z`,
        aggregation: formValue.aggregation,
        fillGaps: formValue.fillGaps || false,
        previewLimit: formValue.fillGaps ? 10000 : 1000,
      };

      this.reportsService.reportControllerGeneratePreview({ body: request }).subscribe({
        next: (response: any) => {
          this.previewColumns = response.columns || [];
          this.previewRows = response.rows || [];
          this.previewSummary = response.summary || [];
          this.updateChart();
          this.loadingPreview = false;
        },
        error: (err) => {
          console.error('Preview error:', err);
          alert(err.error?.message || 'Gagal generate preview');
          this.loadingPreview = false;
        },
      });
    } catch (error: any) {
      console.error('Preview error:', error);
      alert(error.message || 'Gagal generate preview');
      this.loadingPreview = false;
    }
  }

  async exportXlsx(): Promise<void> {
    if (this.filterForm.invalid) {
      alert('Error: Silakan pilih minimal satu sensor channel');
      return;
    }

    // Must have preview data first
    if (!this.previewRows.length || !this.previewColumns.length) {
      alert('Silakan klik Preview terlebih dahulu');
      return;
    }

    this.exporting = true;

    try {
      const workbook = new Workbook();
      workbook.creator = 'IoT Report System';
      workbook.created = new Date();

      // Get sensor columns (exclude timestamp)
      const sensorCols = this.previewColumns.filter(c => c.key !== 'timestamp');
      const formValue = this.filterForm.value;

      // Get project name
      const selectedProject = this.projects.find(p => p.idProject === formValue.projectId);
      const projectName = selectedProject?.name || 'All Projects';

      // === Single Sheet: Report ===
      const sheet = workbook.addWorksheet('Report');
      let currentRow = 1;

      // === HEADER SECTION ===
      // Title
      sheet.mergeCells(`A${currentRow}:${String.fromCharCode(65 + sensorCols.length)}${currentRow}`);
      const titleCell = sheet.getCell(`A${currentRow}`);
      titleCell.value = 'IoT SENSOR DATA REPORT';
      titleCell.font = { bold: true, size: 18 };
      titleCell.alignment = { horizontal: 'center' };
      currentRow += 2;

      // Client/Project Info
      sheet.getCell(`A${currentRow}`).value = 'Project:';
      sheet.getCell(`A${currentRow}`).font = { bold: true };
      sheet.getCell(`B${currentRow}`).value = projectName;
      currentRow++;

      sheet.getCell(`A${currentRow}`).value = 'Generated:';
      sheet.getCell(`A${currentRow}`).font = { bold: true };
      sheet.getCell(`B${currentRow}`).value = new Date().toLocaleString('id-ID');
      currentRow++;

      sheet.getCell(`A${currentRow}`).value = 'Period:';
      sheet.getCell(`A${currentRow}`).font = { bold: true };
      sheet.getCell(`B${currentRow}`).value = `${formValue.startDate} s/d ${formValue.endDate}`;
      currentRow++;

      sheet.getCell(`A${currentRow}`).value = 'Aggregation:';
      sheet.getCell(`A${currentRow}`).font = { bold: true };
      sheet.getCell(`B${currentRow}`).value = this.aggregationModes.find(m => m.value === formValue.aggregation)?.label || formValue.aggregation;
      currentRow += 2;

      // === SUMMARY SECTION ===
      sheet.getCell(`A${currentRow}`).value = 'STATISTIK SUMMARY:';
      sheet.getCell(`A${currentRow}`).font = { bold: true, size: 12 };
      currentRow++;

      // Summary headers
      const summaryHeaders = ['Sensor', 'Unit', 'Min', 'Avg', 'Max', 'Count'];
      const summaryHeaderRow = sheet.getRow(currentRow);
      summaryHeaders.forEach((header, idx) => {
        const cell = summaryHeaderRow.getCell(idx + 1);
        cell.value = header;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
        cell.alignment = { horizontal: 'center' };
      });
      currentRow++;

      // Summary data
      for (const item of this.previewSummary) {
        const row = sheet.getRow(currentRow);
        row.getCell(1).value = item.label;
        row.getCell(2).value = item.unit || '-';
        row.getCell(3).value = item.min;
        row.getCell(4).value = item.avg;
        row.getCell(5).value = item.max;
        row.getCell(6).value = item.count;
        currentRow++;
      }
      currentRow++;

      // === DATA SECTION ===
      sheet.getCell(`A${currentRow}`).value = 'DATA TELEMETRY:';
      sheet.getCell(`A${currentRow}`).font = { bold: true, size: 12 };
      currentRow++;

      // Data headers - using A, B, C letters for sensor columns
      const dataHeaders = ['Timestamp', ...sensorCols.map((_, idx) => String.fromCharCode(65 + idx))];
      const dataHeaderRow = sheet.getRow(currentRow);
      dataHeaders.forEach((header, idx) => {
        const cell = dataHeaderRow.getCell(idx + 1);
        cell.value = header;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
        cell.alignment = { horizontal: 'center' };
      });
      currentRow++;

      // Data rows
      for (const row of this.previewRows) {
        const values = row['values'] as Record<string, number | null> || {};
        const excelRow = sheet.getRow(currentRow);
        excelRow.getCell(1).value = row.timestamp;
        sensorCols.forEach((col, idx) => {
          const val = values[col.key!];
          excelRow.getCell(idx + 2).value = val !== null && val !== undefined ? Number(val.toFixed(3)) : null;
        });
        currentRow++;
      }
      currentRow++;

      // === LEGEND SECTION (at the end) ===
      sheet.getCell(`A${currentRow}`).value = 'KETERANGAN KOLOM:';
      sheet.getCell(`A${currentRow}`).font = { bold: true, size: 12 };
      currentRow++;

      sensorCols.forEach((col, idx) => {
        const letter = String.fromCharCode(65 + idx); // A, B, C...
        sheet.getCell(`A${currentRow}`).value = `${letter}:`;
        sheet.getCell(`A${currentRow}`).font = { bold: true };
        sheet.getCell(`B${currentRow}`).value = `${col.label}${col.unit ? ' (' + col.unit + ')' : ''}`;
        currentRow++;
      });

      // Auto-width columns
      sheet.columns.forEach((col, i) => {
        col.width = i === 0 ? 22 : 15;
      });

      // Generate and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const fileName = `report-${projectName.replace(/\s+/g, '_')}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      saveAs(blob, fileName);

      this.exporting = false;
    } catch (error: any) {
      console.error('Export error:', error);
      alert(error.message || 'Gagal export');
      this.exporting = false;
    }
  }

  async saveAsTemplate(): Promise<void> {
    const name = prompt('Masukkan nama template:');
    if (!name) return;

    try {
      const formValue = this.filterForm.value;
      const templateData = {
        name,
        config: {
          projectId: formValue.projectId || undefined,
          nodeIds: formValue.nodeIds?.length > 0 ? formValue.nodeIds : undefined,
          sensorChannelIds: formValue.sensorChannelIds,
          rangeType: formValue.rangeType,
          aggregation: formValue.aggregation,
          fillGaps: formValue.fillGaps || false,
        },
      };

      this.reportsService.reportControllerCreateTemplate({ body: templateData as any }).subscribe({
        next: () => {
          alert(`Template "${name}" berhasil disimpan`);
          this.loadTemplates();
        },
        error: (err) => {
          console.error('Save template error:', err);
          alert(err.error?.message || 'Gagal menyimpan template');
        },
      });
    } catch (error: any) {
      alert(error.message || 'Gagal menyimpan template');
    }
  }

  loadTemplate(template: ReportTemplate): void {
    this.selectedTemplate = template;
    this.filterForm.patchValue({
      projectId: template.config.projectId || '',
      nodeIds: template.config.nodeIds || [],
      sensorChannelIds: template.config.sensorChannelIds,
      rangeType: template.config.rangeType,
      aggregation: template.config.aggregation,
      fillGaps: template.config.fillGaps || false,
    });

    // Load dependent data
    if (template.config.projectId) {
      this.loadNodes(template.config.projectId);
    }
    if (template.config.nodeIds?.length) {
      this.loadSensorChannels(template.config.nodeIds);
    }
  }

  async deleteTemplate(template: ReportTemplate): Promise<void> {
    const confirmed = confirm(`Yakin ingin menghapus template "${template.name}"?`);
    if (!confirmed) return;

    try {
      this.reportsService.reportControllerDeleteTemplate({ id: template.id }).subscribe({
        next: () => {
          alert('Template berhasil dihapus');
          this.loadTemplates();
          if (this.selectedTemplate?.id === template.id) {
            this.selectedTemplate = null;
          }
        },
        error: (err) => {
          console.error('Delete template error:', err);
          alert(err.error?.message || 'Gagal menghapus template');
        },
      });
    } catch (error: any) {
      alert(error.message || 'Gagal menghapus template');
    }
  }

  private updateChart(): void {
    if (!this.previewRows?.length || !this.previewColumns?.length) {
      return;
    }

    // Build chart data from preview - filter by key since backend uses 'key'
    const sensorColumns = this.previewColumns.filter((c) => c.key !== 'timestamp');
    const timestamps = this.previewRows.map((r: any) => r.timestamp);
    const series = sensorColumns.map((col) => ({
      name: col.label || col.key,
      data: this.previewRows.map((r: any) => r.values?.[col.key!] ?? null),
    }));

    this.chartOptions = {
      series,
      chart: {
        type: 'line',
        height: 350,
        toolbar: { show: true },
        zoom: { enabled: true },
        foreColor: '#ffffff'
      },
      xaxis: {
        categories: timestamps.map((ts: string) => {
          const date = new Date(ts);
          return date.toLocaleString('id-ID', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
        }),
        labels: {
          rotate: -45,
          rotateAlways: true,
          style: {
            colors: '#ffffff'
          }
        },
      },
      yaxis: {
        labels: {
          formatter: (val: number) => val?.toFixed(2) ?? '-',
          style: {
            colors: '#ffffff'
          }
        },
      },
      tooltip: {
        x: {
          formatter: (val: number, opts: any) => {
            const ts = timestamps[opts.dataPointIndex];
            return new Date(ts).toLocaleString('id-ID');
          },
        },
        theme: 'dark'
      },
      stroke: {
        curve: 'smooth',
        width: 2,
      },
      legend: {
        position: 'top',
        labels: {
          colors: '#ffffff'
        }
      },
    };
    this.showChart = true;
  }

  getChannelLabel(channel: SensorChannel): string {
    return channel.label + (channel.unit ? ` (${channel.unit})` : '');
  }

  formatTimestamp(ts: string): string {
    return new Date(ts).toLocaleString('id-ID');
  }

  formatNumber(val: number | null): string {
    if (val === null || val === undefined) return '-';
    return val.toFixed(3);
  }

  getDataColumns(): ReportColumn[] {
    // Return columns excluding timestamp (filter by key since backend uses 'key')
    return this.previewColumns.filter((col) => col.key !== 'timestamp' && col.field !== 'timestamp');
  }

  getColumnLetter(index: number): string {
    // Convert index to letter: 0->A, 1->B, 2->C, etc.
    return String.fromCharCode(65 + index);
  }

  getRowValue(row: any, col: ReportColumn): string {
    // Use key or field as the property name
    const field = col.key || col.field;
    // Data is nested inside row.values
    const val = row.values?.[field];
    if (val === null || val === undefined) return '-';
    if (typeof val === 'number') return val.toFixed(3);
    return String(val);
  }
}
