import { Directive, ElementRef, EventEmitter, OnDestroy, OnInit, Output, Renderer2 } from '@angular/core';

/**
 * Pull-to-refresh untuk container scroll (.m-content). Saat scrollTop<=0 dan user tarik ke bawah
 * melewati ambang → emit (mPull). Skip area peta/embed/json (punya scroll/gesture sendiri).
 */
@Directive({ selector: '[mPull]', standalone: false })
export class PullRefreshDirective implements OnInit, OnDestroy {
  @Output() mPull = new EventEmitter<void>();

  private ind!: HTMLElement;
  private icon!: HTMLElement;
  private startY = 0;
  private active = false;
  private dist = 0;
  private refreshing = false;
  private readonly TH = 64;
  private readonly MAX = 92;
  private cleanup: Array<() => void> = [];

  constructor(private el: ElementRef<HTMLElement>, private r: Renderer2) {}

  ngOnInit(): void {
    const host = this.el.nativeElement;
    this.ind = this.r.createElement('div');
    this.r.addClass(this.ind, 'm-ptr');
    this.icon = this.r.createElement('i');
    this.r.addClass(this.icon, 'fa');
    this.r.addClass(this.icon, 'fa-arrow-down');
    this.r.appendChild(this.ind, this.icon);
    this.r.appendChild(host, this.ind);

    const start = (e: TouchEvent) => this.onStart(e);
    const move = (e: TouchEvent) => this.onMove(e);
    const end = () => this.onEnd();
    host.addEventListener('touchstart', start, { passive: true });
    host.addEventListener('touchmove', move, { passive: false });
    host.addEventListener('touchend', end, { passive: true });
    this.cleanup = [
      () => host.removeEventListener('touchstart', start),
      () => host.removeEventListener('touchmove', move),
      () => host.removeEventListener('touchend', end)
    ];
  }

  private onStart(e: TouchEvent): void {
    if (this.refreshing) { return; }
    const t = e.target as HTMLElement;
    if (t.closest && t.closest('.m-olmap, .m-scada-embed, .m-json, .ol-viewport')) { return; }
    if (this.el.nativeElement.scrollTop <= 0) { this.startY = e.touches[0].clientY; this.active = true; this.dist = 0; }
  }
  private onMove(e: TouchEvent): void {
    if (!this.active || this.refreshing) { return; }
    const dy = e.touches[0].clientY - this.startY;
    if (dy <= 0 || this.el.nativeElement.scrollTop > 0) { this.active = false; this.set(0); return; }
    this.dist = Math.min(dy * 0.5, this.MAX);
    this.set(this.dist);
    if (this.dist > 6) { e.preventDefault(); }
  }
  private onEnd(): void {
    if (!this.active || this.refreshing) { return; }
    this.active = false;
    if (this.dist >= this.TH) { this.fire(); } else { this.set(0); }
  }

  private set(d: number): void {
    this.r.setStyle(this.ind, 'transform', `translateX(-50%) translateY(${d}px)`);
    this.r.setStyle(this.ind, 'opacity', `${Math.min(d / this.TH, 1)}`);
    this.r.setStyle(this.icon, 'transform', `rotate(${d >= this.TH ? 180 : 0}deg)`);
  }
  private fire(): void {
    this.refreshing = true;
    this.r.removeClass(this.icon, 'fa-arrow-down');
    this.r.addClass(this.icon, 'fa-spinner');
    this.r.addClass(this.icon, 'fa-spin');
    this.r.setStyle(this.icon, 'transform', 'none');
    this.r.setStyle(this.ind, 'transform', `translateX(-50%) translateY(${this.TH}px)`);
    this.r.setStyle(this.ind, 'opacity', '1');
    this.mPull.emit();
    setTimeout(() => {
      this.refreshing = false;
      this.r.removeClass(this.icon, 'fa-spinner');
      this.r.removeClass(this.icon, 'fa-spin');
      this.r.addClass(this.icon, 'fa-arrow-down');
      this.set(0);
    }, 1000);
  }

  ngOnDestroy(): void { this.cleanup.forEach((fn) => fn()); }
}
