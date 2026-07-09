import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AiConfigListItem, AiNrwService, AiPresetCatalog } from '../../../../services/ai-nrw.service';

/**
 * Daftar Channel — landing AI-NRW. Menampilkan SEMUA sensor channel + status AI-nya.
 * Klik channel → Channel Hub (semua tentang channel itu). Ganti master-list AI Settings lama.
 */
@Component({
  selector: 'ai-channel-list',
  templateUrl: './channel-list.html',
  styleUrls: ['./channel-list.scss'],
  standalone: false,
})
export class ChannelListPage implements OnInit {
  channels: AiConfigListItem[] = [];
  presetCatalogs: AiPresetCatalog[] = [];
  loading = false;
  error: string | null = null;

  groupName = '';
  enabled = '';
  projectId = '';
  nodeId = '';
  searchTerm = '';
  currentPage = 1;
  pageSize = 20;
  total = 0;
  totalPages = 1;
  private searchDebounce?: ReturnType<typeof setTimeout>;

  // opsi filter (dari sekali fetch penuh)
  projectOptions: Array<{ id: string; name: string }> = [];
  private allNodes: Array<{ id: string; name: string; projectId: string }> = [];

  constructor(
    private ai: AiNrwService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.ai.presets().subscribe({
      next: (p) => (this.presetCatalogs = p || []),
      error: () => (this.presetCatalogs = []),
    });
    this.loadFilterOptions();
    this.load();
  }

  /** Sekali fetch banyak channel untuk membangun opsi Project & Node. */
  private loadFilterOptions(): void {
    this.ai.listConfigs({ limit: 1000, page: 1 }).subscribe({
      next: (res) => {
        const projects = new Map<string, string>();
        const nodes = new Map<string, { id: string; name: string; projectId: string }>();
        for (const c of res?.data || []) {
          if (c.projectId) projects.set(c.projectId, c.projectName || c.projectId);
          if (c.nodeId) {
            nodes.set(c.nodeId, {
              id: c.nodeId,
              name: c.nodeName || c.nodeCode || c.nodeId,
              projectId: c.projectId || '',
            });
          }
        }
        this.projectOptions = Array.from(projects, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
        this.allNodes = Array.from(nodes.values()).sort((a, b) => a.name.localeCompare(b.name));
      },
      error: () => {},
    });
  }

  get nodeOptions(): Array<{ id: string; name: string }> {
    return this.projectId ? this.allNodes.filter((n) => n.projectId === this.projectId) : this.allNodes;
  }

  onProjectChange(): void {
    this.nodeId = ''; // reset node saat project berubah
    this.applyFilter();
  }

  get groupOptions(): string[] {
    const set = new Set<string>();
    this.presetCatalogs.forEach((c) => (c.groupNames || []).forEach((g) => set.add(g)));
    return Array.from(set);
  }

  load(): void {
    this.loading = true;
    this.error = null;
    this.ai
      .listConfigs({
        groupName: this.groupName,
        enabled: this.enabled,
        projectId: this.projectId,
        nodeId: this.nodeId,
        search: this.searchTerm,
        page: this.currentPage,
        limit: this.pageSize,
      })
      .subscribe({
        next: (res) => {
          this.channels = res?.data || [];
          this.total = res?.meta?.total ?? this.channels.length;
          this.totalPages = res?.meta?.totalPages ?? 1;
          this.loading = false;
        },
        error: (err) => {
          this.error = err?.error?.message || err?.message || 'Gagal memuat channel';
          this.loading = false;
        },
      });
  }

  onSearchChange(v: string): void {
    this.searchTerm = v;
    this.currentPage = 1;
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => this.load(), 400);
  }

  applyFilter(): void {
    this.currentPage = 1;
    this.load();
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages || p === this.currentPage) return;
    this.currentPage = p;
    this.load();
  }

  open(targetId: string): void {
    this.router.navigate(['/iot/ai/channel', targetId]);
  }

  get paginationStart(): number {
    return this.total === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }
  get paginationEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.total);
  }
}
