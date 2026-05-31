import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges, ElementRef, AfterViewInit, NgZone, ViewChild } from '@angular/core';
import { Widget } from '../../models/widget.models';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { WidgetBuilderService } from 'src/sdk/core/services';

@Component({
  selector: 'app-widget-container',
  standalone: false,
  templateUrl: './widget-container.component.html',
  styleUrls: ['./widget-container.component.css']
})
export class WidgetContainerComponent implements OnInit, OnDestroy, OnChanges, AfterViewInit {
  private destroy$ = new Subject<void>();
  private resizeObserver: ResizeObserver | null = null;

  /** Reference to widget wrapper element for size tracking */
  @ViewChild('widgetWrapper', { static: false }) widgetWrapper!: ElementRef<HTMLDivElement>;

  @Input() widget: Widget | undefined;
  @Input() editMode = false;
  @Input() timeRange: string = '6h';
  @Input() timeFrom: number = 0;
  @Input() timeTo: number = 0;
  @Input() isFullscreen = false;
  /** Dashboard-level variables from layoutConfig.variables */
  @Input() dashboardVariables: Record<string, string> = {};
  /** Enable debug mode to show container dimensions */
  @Input() debugMode = false;

  @Output() edit = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();
  @Output() refresh = new EventEmitter<void>();
  @Output() toggleFullscreen = new EventEmitter<void>();
  @Output() duplicate = new EventEmitter<void>();

  loading = true;
  error: string | null = null;
  chartData: any[] = [];
  columns: string[] = [];

  /** Container pixel dimensions (updated via ResizeObserver) */
  containerWidth = 0;
  containerHeight = 0;

  constructor(
    private widgetBuilderService: WidgetBuilderService,
    private elementRef: ElementRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.loadWidgetData();
  }

  ngAfterViewInit(): void {
    this.initResizeObserver();
  }

  private initResizeObserver(): void {
    // Wait a tick to ensure ViewChild is available
    setTimeout(() => {
      const targetElement = this.widgetWrapper?.nativeElement || this.elementRef.nativeElement;
      
      // Use ResizeObserver to track container pixel dimensions
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          this.ngZone.run(() => {
            this.containerWidth = Math.round(width);
            this.containerHeight = Math.round(height);
          });
        }
      });

      this.resizeObserver.observe(targetElement);
    }, 0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['timeRange'] && !changes['timeRange'].firstChange) ||
        (changes['timeFrom'] && !changes['timeFrom'].firstChange) ||
        (changes['timeTo'] && !changes['timeTo'].firstChange)) {
      this.loadWidgetData();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Clean up ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }

  loadWidgetData(): void {
    if (!this.widget) return;

    this.loading = true;
    this.error = null;

    const config = this.widget.config || {} as any;
    const queries = config.queries as any[] | undefined;

    // Multi-query mode: execute all queries and merge
    if (queries && queries.length > 1) {
      this.executeMultipleQueries(queries, config);
      return;
    }

    // Single-query mode (default / backward compatible)
    const sqlQuery = this.widget.sqlQuery || config.sqlQuery;
    
    if (!sqlQuery) {
      this.error = 'No SQL query configured for this widget';
      this.loading = false;
      return;
    }

    const dataSource = config.dataSource || 'postgresql';

    // Merge variables: dashboard-level → widget-level (widget overrides dashboard)
    const mergedVariables: Record<string, string> = {
      ...(this.dashboardVariables || {}),
      ...(config.variables || {}),
    };

    const requestBody: any = {
      sql: sqlQuery,
      dataSource: dataSource,
      variables: mergedVariables
    };

    if (this.timeFrom > 0 && this.timeTo > 0) {
      requestBody.from = this.timeFrom;
      requestBody.to = this.timeTo;
    } else {
      requestBody.timeRange = (this.timeRange || '6h') as any;
    }

    this.widgetBuilderService.widgetBuilderControllerExecuteQuery({
      body: requestBody
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response: any) => {
        this.chartData = response.rows || [];
        this.columns = response.columns || [];
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Failed to execute widget query:', err);
        this.error = err.error?.message || err.message || 'Failed to load widget data';
        this.loading = false;
      }
    });
  }

  /** Execute multiple queries and merge results with _source column */
  private executeMultipleQueries(queries: any[], config: any): void {
    const enabledQueries = queries.filter((q: any) => q.enabled !== false && q.sql);
    if (enabledQueries.length === 0) {
      this.error = 'No enabled queries configured';
      this.loading = false;
      return;
    }

    const mergedVariables: Record<string, string> = {
      ...(this.dashboardVariables || {}),
      ...(config.variables || {}),
    };

    let completed = 0;
    const allColumns = new Set<string>(['_source']);
    let allRows: any[] = [];

    for (const q of enabledQueries) {
      const requestBody: any = {
        sql: q.sql,
        dataSource: q.dataSource || 'postgresql',
        variables: mergedVariables
      };

      if (this.timeFrom > 0 && this.timeTo > 0) {
        requestBody.from = this.timeFrom;
        requestBody.to = this.timeTo;
      } else {
        requestBody.timeRange = (this.timeRange || '6h') as any;
      }

      this.widgetBuilderService.widgetBuilderControllerExecuteQuery({
        body: requestBody
      }).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (response: any) => {
          const rows = (response.rows || []).map((row: any) => ({
            ...row,
            _source: q.alias || q.name || 'Query'
          }));
          (response.columns || []).forEach((c: string) => allColumns.add(c));
          allRows = allRows.concat(rows);
          completed++;
          if (completed === enabledQueries.length) {
            this.chartData = allRows;
            this.columns = Array.from(allColumns);
            this.loading = false;
          }
        },
        error: (err: any) => {
          console.error(`[${q.name}] Query failed:`, err);
          completed++;
          if (completed === enabledQueries.length) {
            this.chartData = allRows;
            this.columns = Array.from(allColumns);
            this.loading = false;
            if (allRows.length === 0) {
              this.error = err.error?.message || err.message || 'All queries failed';
            }
          }
        }
      });
    }
  }

  onRefresh(): void {
    this.loadWidgetData();
    this.refresh.emit();
  }

  confirmDelete(): void {
    const widgetName = this.widget?.name || 'this widget';
    if (confirm(`Are you sure you want to delete "${widgetName}"?`)) {
      this.delete.emit();
    }
  }
}
