import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ScadaService, ScadaDiagram } from '@services/scada.service';

/**
 * Tab SCADA: (1) list diagram, (2) klik → embed viewer (view-only) — sama desktop analytics.
 * Iframe + auth handshake: <app-scada-embed> (shared/scada-embed).
 */
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

  activeId = '';
  activeName = '';
  embedFullscreen = false;

  private destroy$ = new Subject<void>();

  constructor(
    private scada: ScadaService,
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
    this.activeId = d.id;
    this.activeName = d.name;
    this.embedFullscreen = false;
  }

  back(): void {
    this.activeId = '';
    this.activeName = '';
    this.embedFullscreen = false;
  }

  // Embedded SCADA can't reliably go native-fullscreen inside an iframe on mobile —
  // it asks us to expand the iframe container to fill the device screen instead.
  onScadaMessage(data: any): void {
    if (data?.type === 'scada-fullscreen') {
      this.embedFullscreen = !!data.value;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next(); this.destroy$.complete();
  }
}
