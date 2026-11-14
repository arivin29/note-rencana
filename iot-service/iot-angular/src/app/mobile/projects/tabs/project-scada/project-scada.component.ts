import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ScadaService } from '@services/scada.service';
import { MobileChromeService } from '../../../shared/mobile-chrome.service';

/**
 * Bagan SCADA layar penuh `/mobile/p/:pid/scada/:did` (dibuka dari kartu Ringkasan).
 * Iframe + auth handshake: <app-scada-embed> bersama (shared/scada-embed) — input tidak diubah.
 * Satu tombol back saja (kembali ke Ringkasan).
 */
@Component({
  selector: 'mobile-project-scada',
  templateUrl: './project-scada.component.html',
  standalone: false
})
export class MobileProjectScadaComponent implements OnInit, OnDestroy {
  projectId = '';
  activeId = '';
  activeName = 'Bagan SCADA';
  embedFullscreen = false;

  private destroy$ = new Subject<void>();

  constructor(
    private scada: ScadaService,
    private route: ActivatedRoute,
    private router: Router,
    private chrome: MobileChromeService
  ) {}

  ngOnInit(): void {
    this.projectId = this.route.parent?.snapshot.paramMap.get('pid') || '';
    this.activeId = this.route.snapshot.paramMap.get('did') || '';
    this.scada.getDiagramsByProject(this.projectId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (list) => {
        const d = (list || []).find((x) => x.id === this.activeId);
        if (d?.name) { this.activeName = d.name; this.chrome.setTitle('page', d.name); }
      },
      error: () => { /* nama opsional; viewer tetap jalan */ }
    });
  }

  back(): void {
    if (this.chrome.canGoBackInApp) { history.back(); return; }
    this.router.navigate(['/mobile/p', this.projectId, 'ringkasan'], { replaceUrl: true });
  }

  // Embedded SCADA can't reliably go native-fullscreen inside an iframe on mobile —
  // it asks us to expand the iframe container to fill the device screen instead.
  onScadaMessage(data: any): void {
    if (data?.type === 'scada-fullscreen') {
      this.embedFullscreen = !!data.value;
    }
  }

  ngOnDestroy(): void {
    this.chrome.clearTitle('page');
    this.destroy$.next(); this.destroy$.complete();
  }
}
