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
  private tokenSent = false;

  @ViewChild('scadaIframe') iframe?: ElementRef<HTMLIFrameElement>;
  private destroy$ = new Subject<void>();

  constructor(
    private scada: ScadaService,
    private auth: AuthService,
    private sanitizer: DomSanitizer,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.projectId = this.route.parent?.snapshot.paramMap.get('id') || '';
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
    const raw = this.scada.getEmbedUrl(this.projectId, d.id, 'view');
    this.embedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(raw);
  }

  back(): void {
    this.embedUrl = null;
    this.activeName = '';
    this.tokenSent = false;
  }

  onIframeLoad(): void { this.sendToken(); }

  private sendToken(): void {
    if (this.tokenSent) { return; }
    const token = this.auth.getAccessToken();
    const cw = this.iframe?.nativeElement?.contentWindow;
    if (token && cw) {
      cw.postMessage({ type: 'scada-auth', token }, environment.scadaUrl);
      this.tokenSent = true;
    }
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
