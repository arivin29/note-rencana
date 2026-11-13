import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges, ElementRef, AfterViewInit, NgZone, ViewChild } from '@angular/core';
import { Widget } from '../../models/widget.models';
import { Subject, Subscription } from 'rxjs';
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
  /** Changes on every dashboard-level refresh → reload even when from/to are unchanged */
  @Input() refreshNonce = 0;
  /** TV mode text scale (box width / 1920) for chart renderers */
  @Input() fontScale = 1;
  /** Dashboard's project (map widget draws the project's map layers; null = skip) */
  @Input() projectId: string | null = null;
  /** Hide destructive/edit actions (embedded Monitor, fullscreen) */
  @Input() readOnly = false;
  /** Enable debug mode to show container dimensions */
  @Input() debugMode = false;

  @Output() edit = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();
  @Output() refresh = new EventEmitter<void>();
  @Output() toggleFullscreen = new EventEmitter<void>();
  @Output() duplicate = new EventEmitter<void>();
  /** Emitted after every load attempt (dashboard uses it for "Diperbarui" + failure streak) */
  @Output() loadResult = new EventEmitter<{ ok: boolean; at: Date }>();

  /** True only while the FIRST load has no data yet (shows spinner). */
  loading = true;
  /** True during a background reload — previous data stays visible. */
  refreshing = false;
  /** Last reload failed but previous data is still shown. */
  stale = false;
  lastLoadedAt: Date | null = null;
  /** In-flight query subscriptions of the current load (cancelled when a newer load starts). */
  private inflight = new Subscription();
  private pending = false;
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
    const tick = changes['refreshNonce'] && !changes['refreshNonce'].firstChange;
    const rangeChanged = (changes['timeRange'] && !changes['timeRange'].firstChange) ||
        (changes['timeFrom'] && !changes['timeFrom'].firstChange) ||
        (changes['timeTo'] && !changes['timeTo'].firstChange);
    if (tick) {
      // Auto-refresh tick: skip while the previous query is still running (slow ClickHouse
      // queries must not pile up). The next tick will catch up.
      if (!this.pending) this.loadWidgetData();
    } else if (rangeChanged) {
      // User changed the range: cancel the in-flight query so an older response can't win.
      this.loadWidgetData();
    }
  }

  ngOnDestroy(): void {
    this.inflight.unsubscribe();
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

    this.beginLoad();

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
      this.finishError('Widget belum memiliki query SQL');
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

    this.inflight.add(this.widgetBuilderService.widgetBuilderControllerExecuteQuery({
      body: requestBody
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response: any) => {
        this.finishOk(response.rows || [], response.columns || []);
      },
      error: (err: any) => {
        console.error('Failed to execute widget query:', err);
        this.finishError(err.error?.message || err.message || 'Gagal memuat data widget');
      }
    }));
  }

  /** Execute multiple queries and merge results with _source column */
  private executeMultipleQueries(queries: any[], config: any): void {
    const enabledQueries = queries.filter((q: any) => q.enabled !== false && q.sql);
    if (enabledQueries.length === 0) {
      this.finishError('Tidak ada query aktif');
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

      this.inflight.add(this.widgetBuilderService.widgetBuilderControllerExecuteQuery({
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
            this.finishOk(allRows, Array.from(allColumns));
          }
        },
        error: (err: any) => {
          console.error(`[${q.name}] Query failed:`, err);
          completed++;
          if (completed === enabledQueries.length) {
            if (allRows.length === 0) {
              this.finishError(err.error?.message || err.message || 'Semua query gagal');
            } else {
              this.finishOk(allRows, Array.from(allColumns));
            }
          }
        }
      }));
    }
  }

  private get hasData(): boolean {
    return this.lastLoadedAt !== null;
  }

  private beginLoad(): void {
    // Cancel whatever is still running for this widget — only the newest load may update it.
    this.inflight.unsubscribe();
    this.inflight = new Subscription();
    this.pending = true;
    if (this.hasData) {
      this.refreshing = true;   // keep previous chart visible — no flicker
    } else {
      this.loading = true;
    }
  }

  private finishOk(rows: any[], columns: string[]): void {
    this.chartData = rows;
    this.columns = columns;
    this.error = null;
    this.stale = false;
    this.loading = false;
    this.refreshing = false;
    this.lastLoadedAt = new Date();
    this.pending = false;
    this.loadResult.emit({ ok: true, at: this.lastLoadedAt });
  }

  private finishError(message: string): void {
    this.error = message;
    this.stale = this.hasData;  // previous data stays on screen, marked as stale
    this.loading = false;
    this.refreshing = false;
    this.pending = false;
    this.loadResult.emit({ ok: false, at: new Date() });
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
