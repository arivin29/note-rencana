import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ScadaService, ScadaDiagram, CreateScadaDiagramPayload } from '../../../../../../services/scada.service';
import { AuthService } from '../../../../../../services/auth.service';
import { environment } from '../../../../../../../environments/environment';

@Component({
  selector: 'app-analytics-page',
  templateUrl: './analytics-page.component.html',
  styleUrls: ['./analytics-page.component.scss'],
  standalone: false
})
export class AnalyticsPageComponent implements OnInit, OnDestroy {
  @ViewChild('scadaIframe') scadaIframe!: ElementRef<HTMLIFrameElement>;

  projectId = '';
  diagrams: ScadaDiagram[] = [];
  loading = true;
  error = '';

  // Embed state
  embedUrl: SafeResourceUrl | null = null;
  embedMode: 'list' | 'view' | 'edit' = 'list';
  activeDiagramId = '';
  activeDiagramName = '';
  private tokenSent = false;

  // Add diagram modal
  showAddModal = false;
  newDiagramName = '';
  newDiagramDescription = '';
  creating = false;

  // Delete confirm
  deletingId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    private scadaService: ScadaService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.route.parent?.paramMap.subscribe(params => {
      this.projectId = params.get('projectId') || '';
      if (this.projectId) {
        this.loadDiagrams();
      }
    });
  }

  ngOnDestroy(): void {
    this.embedUrl = null;
  }

  loadDiagrams(): void {
    this.loading = true;
    this.error = '';
    this.scadaService.getDiagramsByProject(this.projectId).subscribe({
      next: (data) => {
        this.diagrams = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to load SCADA diagrams';
        this.loading = false;
      }
    });
  }

  // ── Open diagram in iframe ──

  openDiagram(diagram: ScadaDiagram, mode: 'view' | 'edit'): void {
    this.activeDiagramId = diagram.id;
    this.activeDiagramName = diagram.name;
    this.embedMode = mode;
    this.tokenSent = false;

    const rawUrl = this.scadaService.getEmbedUrl(this.projectId, diagram.id, mode);
    this.embedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(rawUrl);
  }

  onIframeLoad(): void {
    if (this.tokenSent) return;
    // Send auth token to SCADA app via postMessage
    const token = this.authService.getAccessToken();
    if (token && this.scadaIframe?.nativeElement?.contentWindow) {
      this.scadaIframe.nativeElement.contentWindow.postMessage(
        { type: 'scada-auth', token },
        environment.scadaUrl
      );
      this.tokenSent = true;
    }
  }

  closeEmbed(): void {
    this.embedUrl = null;
    this.embedMode = 'list';
    this.activeDiagramId = '';
    this.activeDiagramName = '';
    this.tokenSent = false;
    // Refresh list in case changes were made
    this.loadDiagrams();
  }

  // ── CRUD ──

  openAddModal(): void {
    this.newDiagramName = '';
    this.newDiagramDescription = '';
    this.showAddModal = true;
  }

  closeAddModal(): void {
    this.showAddModal = false;
  }

  createDiagram(): void {
    if (!this.newDiagramName.trim()) return;
    this.creating = true;

    const user = this.authService.currentUserValue;
    const payload: CreateScadaDiagramPayload = {
      name: this.newDiagramName.trim(),
      ownerId: user?.idOwner || user?.idUser || '',
      projectId: this.projectId,
      description: this.newDiagramDescription.trim() || undefined
    };

    this.scadaService.createDiagram(payload).subscribe({
      next: () => {
        this.creating = false;
        this.showAddModal = false;
        this.loadDiagrams();
      },
      error: (err) => {
        this.creating = false;
        this.error = err?.error?.message || 'Failed to create diagram';
      }
    });
  }

  confirmDelete(id: string): void {
    this.deletingId = id;
  }

  cancelDelete(): void {
    this.deletingId = null;
  }

  deleteDiagram(id: string): void {
    this.scadaService.deleteDiagram(id).subscribe({
      next: () => {
        this.deletingId = null;
        this.loadDiagrams();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to delete diagram';
        this.deletingId = null;
      }
    });
  }

  // Helpers
  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'published': return 'bg-success-subtle text-success';
      case 'draft': return 'bg-warning-subtle text-warning';
      default: return 'bg-secondary-subtle text-secondary';
    }
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
}
