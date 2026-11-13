import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges, ElementRef, AfterViewInit, NgZone } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { Widget } from '../../../models/widget.models';
import { buildLineChartOptions } from '../../../utils/line-chart-options';
import { ChartTheme, observeThemeChange, readChartTheme } from '../../../utils/chart-theme';

/**
 * Time-series widget. Options come from the pure `buildLineChartOptions` (shared with both wizard
 * previews) — change the chart there, not here. This component only feeds it the chart host size
 * (Y tick count follows the real plot height), the text scale and the current theme.
 */
@Component({
  selector: 'app-line-chart-widget',
  standalone: false,
  templateUrl: './line-chart-widget.component.html',
  styleUrls: ['./line-chart-widget.component.css']
})
export class LineChartWidgetComponent implements OnInit, OnDestroy, OnChanges, AfterViewInit {
  private destroy$ = new Subject<void>();
  private resizeObserver: ResizeObserver | null = null;
  private resizeSubject$ = new Subject<void>();
  private stopThemeObserver: () => void = () => undefined;
  private theme: ChartTheme = readChartTheme();
  /** Chart host size measured by the ResizeObserver (the widget body, not the whole panel). */
  private hostW = 0;
  private hostH = 0;

  @Input() widget!: Widget;
  @Input() data: any[] = [];
  @Input() columns: string[] = [];
  /** Container width in pixels from parent widget-container (fallback until the host is measured). */
  @Input() containerWidth = 0;
  /** Container height in pixels from parent widget-container (includes the panel header). */
  @Input() containerHeight = 0;
  /** Text scale (TV screen fit × "Ukuran huruf"). */
  @Input() fontScale = 1;

  @Output() chartInit = new EventEmitter<any>();

  echartsInstance: any = null;
  chartOptions: any = null;

  constructor(
    private elementRef: ElementRef<HTMLElement>,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.setupResizeDebounce();
    this.buildChartOptions();
    this.ngZone.runOutsideAngular(() => {
      this.stopThemeObserver = observeThemeChange(() => this.ngZone.run(() => {
        this.theme = readChartTheme();
        this.buildChartOptions();
      }));
    });
  }

  ngAfterViewInit(): void {
    this.setupResizeObserver();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const first = Object.values(changes).every(c => c.firstChange);
    if (first) return; // ngOnInit builds
    if (changes['widget'] || changes['data'] || changes['fontScale']) {
      this.buildChartOptions();
    } else if ((changes['containerWidth'] || changes['containerHeight']) && !this.hostH) {
      this.buildChartOptions();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.resizeSubject$.complete();
    this.resizeObserver?.disconnect();
    this.stopThemeObserver();
  }

  onChartInit(ec: any): void {
    this.echartsInstance = ec;
    this.chartInit.emit(ec);
  }

  private setupResizeObserver(): void {
    if (typeof ResizeObserver === 'undefined') return;
    this.ngZone.runOutsideAngular(() => {
      this.resizeObserver = new ResizeObserver(() => this.resizeSubject$.next());
      this.resizeObserver.observe(this.elementRef.nativeElement);
    });
  }

  private setupResizeDebounce(): void {
    this.resizeSubject$.pipe(debounceTime(100), takeUntil(this.destroy$)).subscribe(() => {
      const el = this.elementRef.nativeElement;
      const w = Math.round(el.clientWidth);
      const h = Math.round(el.clientHeight);
      const changed = Math.abs(w - this.hostW) > 2 || Math.abs(h - this.hostH) > 2;
      this.hostW = w;
      this.hostH = h;
      this.ngZone.run(() => {
        // tick count / label density depend on the plot size → rebuild, then resize the canvas
        if (changed) this.buildChartOptions();
        this.echartsInstance?.resize();
      });
    });
  }

  private buildChartOptions(): void {
    if (!this.widget) {
      this.chartOptions = null;
      return;
    }
    const s = Number.isFinite(this.fontScale) && this.fontScale > 0 ? this.fontScale : 1;
    this.chartOptions = buildLineChartOptions(this.widget.config || {}, this.data || [], {
      width: this.hostW || this.containerWidth,
      // before the first measure: panel height minus the (scaled) panel header
      height: this.hostH || (this.containerHeight > 0 ? this.containerHeight - 36 * s : 0),
      fontScale: s,
      theme: this.theme,
    });
  }
}
