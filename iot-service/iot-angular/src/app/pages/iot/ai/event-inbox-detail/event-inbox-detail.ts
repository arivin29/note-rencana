import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AiEventDetail, AiNrwService } from '../../../../services/ai-nrw.service';

/**
 * Event Detail — konteks + kronologi + aksi lifecycle (dok 08 §2).
 * Verdikt/assign/close/reopen menulis lewat Go; verdictBy+verdictAt selalu tercatat.
 */
@Component({
  selector: 'ai-event-inbox-detail',
  templateUrl: './event-inbox-detail.html',
  styleUrls: ['./event-inbox-detail.scss'],
  standalone: false,
})
export class EventInboxDetailPage implements OnInit {
  id: string | null = null;
  event: AiEventDetail | null = null;
  loading = true;
  error: string | null = null;

  // form aksi
  verdict = 'benar';
  verdictOptions = [
    { value: 'benar', label: 'Benar (anomali nyata)' },
    { value: 'false_alarm', label: 'False alarm' },
    { value: 'abaikan', label: 'Abaikan' },
  ];
  verdictNote = '';
  assignedTo = '';
  assignNote = '';
  closeNote = '';
  submitting = false;
  actionMsg: string | null = null;
  actionErr: string | null = null;

  private readonly activeStatuses = ['baru', 'ditinjau', 'ditindak'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ai: AiNrwService,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((p) => {
      this.id = p.get('id');
      if (this.id) this.load();
    });
  }

  load(): void {
    this.loading = true;
    this.error = null;
    this.ai.getEvent(this.id!).subscribe({
      next: (e) => {
        this.event = e;
        this.rebuildDerived();
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || err?.message || 'Gagal memuat event';
        this.loading = false;
      },
    });
  }

  get isActive(): boolean {
    return !!this.event && this.activeStatuses.includes(this.event.status);
  }

  // Precompute (referensi stabil) — memanggil getter yg balikin array objek baru
  // tiap change-detection membuat *ngFor loop tak stabil → freeze. Hitung sekali saat data berubah.
  contextEntries: Array<{ k: string; v: any }> = [];
  typicalHourEntries: Array<{ h: string; n: number }> = [];

  private rebuildDerived(): void {
    const c = this.event?.context;
    this.contextEntries = c ? Object.keys(c).map((k) => ({ k, v: c[k] })) : [];
    const th = this.event?.recurrence?.typicalHour as any;
    const hist = th?.histogram || th;
    this.typicalHourEntries =
      hist && typeof hist === 'object'
        ? Object.keys(hist)
            .map((h) => ({ h, n: Number(hist[h]) }))
            .sort((a, b) => b.n - a.n)
        : [];
  }

  // --- aksi ---
  private run(obs: any, okMsg: string): void {
    this.submitting = true;
    this.actionMsg = null;
    this.actionErr = null;
    obs.subscribe({
      next: (e: AiEventDetail) => {
        this.event = e;
        this.rebuildDerived();
        this.submitting = false;
        this.actionMsg = okMsg;
        this.verdictNote = this.assignNote = this.closeNote = '';
      },
      error: (err: any) => {
        this.submitting = false;
        this.actionErr = err?.error?.message || err?.message || 'Aksi gagal';
      },
    });
  }

  doValidate(): void {
    if (!this.id) return;
    this.run(
      this.ai.validateEvent(this.id, { verdict: this.verdict, note: this.verdictNote || undefined }),
      'Verdikt tersimpan.',
    );
  }

  doAssign(): void {
    if (!this.id || !this.assignedTo.trim()) {
      this.actionErr = 'Isi penerima tugas (user id).';
      return;
    }
    this.run(
      this.ai.assignEvent(this.id, { assignedTo: this.assignedTo.trim(), note: this.assignNote || undefined }),
      'Event ditugaskan.',
    );
  }

  doClose(): void {
    if (!this.id) return;
    this.run(this.ai.closeEvent(this.id, { note: this.closeNote || undefined }), 'Event ditutup.');
  }

  doReopen(): void {
    if (!this.id) return;
    this.run(this.ai.reopenEvent(this.id), 'Event dibuka kembali.');
  }

  back(): void {
    this.router.navigate(['/iot/ai/events']);
  }

  openAnalytics(): void {
    if (this.event) this.router.navigate(['/iot/ai/analytics', this.event.targetId]);
  }

  // --- tampilan ---
  severityBadge(sev: string): string {
    switch (sev) {
      case 'critical':
        return 'badge bg-danger-subtle text-danger';
      case 'warning':
        return 'badge bg-warning-subtle text-warning';
      case 'info':
        return 'badge bg-info-subtle text-info';
      default:
        return 'badge bg-secondary-subtle text-secondary';
    }
  }

  statusBadge(status: string): string {
    switch (status) {
      case 'baru':
        return 'badge bg-danger-subtle text-danger';
      case 'ditinjau':
        return 'badge bg-warning-subtle text-warning';
      case 'ditindak':
        return 'badge bg-info-subtle text-info';
      case 'selesai':
      case 'auto_closed':
        return 'badge bg-success-subtle text-success';
      default:
        return 'badge bg-secondary-subtle text-secondary';
    }
  }

  timelineIcon(kind: string): string {
    return kind === 'user' ? 'fa-user' : 'fa-robot';
  }
}
