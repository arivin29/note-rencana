import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ScadaService, ScadaDiagram } from '@services/scada.service';
import { AuthService } from '@services/auth.service';
import { environment } from 'src/environments/environment';

/** Tab SCADA: (1) list diagram, (2) klik → embed viewer (view-only) — sama desktop analytics. */
@Component({
  selector: 'mobile-project-scada',
  templateUrl: './project-scada.component.html',
  standalone: false
})
export class MobileProjectScadaComponent implements OnInit, OnDestroy {
  loading = true;
  error = '';
  diagrams: ScadaDiagram[] = [];
  projectId = '';

  embedUrl: SafeResourceUrl | null = null;
  activeName = '';
  embedFullscreen = false;
  private tokenSent = false;

  @ViewChild('scadaIframe') iframe?: ElementRef<HTMLIFrameElement>;
  private destroy$ = new Subject<void>();

  // The embedded SCADA posts 'scada-ready' once its message listener is attached.
  // Respond by (re)sending the token — closes the race where the initial onIframeLoad
  // send fires before the child is listening (the "Waiting for authentication…" stuck bug).
  private onMessage = (e: MessageEvent) => {
    if (e?.data?.type === 'scada-ready') {
      this.sendToken(true, e.source as Window | null);
    }
    // Embedded SCADA can't reliably go native-fullscreen inside an iframe on mobile —
    // it asks us to expand the iframe container to fill the device screen instead.
    if (e?.data?.type === 'scada-fullscreen') {
      this.embedFullscreen = !!e.data.value;
    }
  };

  constructor(
    private scada: ScadaService,
    private auth: AuthService,
    private sanitizer: DomSanitizer,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.projectId = this.route.parent?.snapshot.paramMap.get('id') || '';
    window.addEventListener('message', this.onMessage);
    this.load();
  }

  load(): void {
    this.loading = true; this.error = '';
    this.scada.getDiagramsByProject(this.projectId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (d) => { this.diagrams = d || []; this.loading = false; },
      error: (e) => { this.error = e?.error?.message || e?.message || 'Gagal memuat SCADA'; this.loading = false; }
    });
  }

  open(d: ScadaDiagram): void {
    this.activeName = d.name;
    this.tokenSent = false;
    this.embedFullscreen = false;
    const raw = this.scada.getEmbedUrl(this.projectId, d.id, 'view');
    this.embedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(raw);
  }

  back(): void {
    this.embedUrl = null;
    this.activeName = '';
    this.tokenSent = false;
    this.embedFullscreen = false;
  }

  onIframeLoad(): void { this.sendToken(); }

  private sendToken(force = false, target?: Window | null): void {
    if (this.tokenSent && !force) { return; }
    const token = this.auth.getAccessToken();
    const cw = target ?? this.iframe?.nativeElement?.contentWindow;
    if (token && cw) {
      cw.postMessage({ type: 'scada-auth', token }, environment.scadaUrl);
      this.tokenSent = true;
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('message', this.onMessage);
    this.destroy$.next(); this.destroy$.complete();
  }
}
