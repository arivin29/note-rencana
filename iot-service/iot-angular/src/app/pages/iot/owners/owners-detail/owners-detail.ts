import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { OwnersService } from '@sdk/core/services/owners.service';
import { UsersService } from '@sdk/core/services/users.service';
import { UserResponseDto } from '@sdk/core/models/user-response-dto';
import { fetchAll, parseBody } from '@app/shared/utils/fetch-all';
import {
  ProjectHealth, HealthState, healthOf, healthState, deadNodes,
  HEALTH_LABEL, HEALTH_BADGE, HEALTH_ORDER
} from '@app/shared/utils/project-health';
import { timeAgoId } from '@app/shared/utils/channel-display';
import { TenantApiKeyResponse, RateLimitPlan } from '../../../../services/tenant-api-keys.service';
import { OwnerApiKeysService, OwnerApiKeyCreate } from '../owner-api-keys.service';
import { normalizeSla } from '../owner-form-options';
import { UserModal } from '../user-modal/user-modal';

interface OwnerView {
  idOwner: string;
  name: string;
  ownerCode: string;
  industry: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  sla: string | null;
  createdAt: string | null;
  totalProjects: number;
  totalSensors: number;
}

interface ProjectRow {
  idProject: string;
  name: string;
  areaType: string;
  status: string;
  nodeCount: number;
  health: ProjectHealth | null;
  state: HealthState;
}

type DetailTab = 'summary' | 'projects' | 'users' | 'apikeys';

// Plan names only: the backend has no rate limiter yet, so no per-minute numbers are shown.
const RATE_LIMIT_LABEL: Record<string, string> = {
  basic: 'Basic', standard: 'Standard', premium: 'Premium'
};

@Component({
  selector: 'owners-detail',
  templateUrl: './owners-detail.html',
  styleUrls: ['./owners-detail.scss'],
  standalone: false
})
export class OwnersDetailPage implements OnInit, OnDestroy {
  ownerId = '';
  activeTab: DetailTab = 'summary';

  loading = false;
  error: string | null = null;
  owner: OwnerView | null = null;
  health: ProjectHealth | null = null;
  projects: ProjectRow[] = [];

  // Pengguna
  users: UserResponseDto[] = [];
  usersLoading = false;
  usersError: string | null = null;
  usersLoaded = false;

  // API key
  apiKeys: TenantApiKeyResponse[] = [];
  apiKeysLoading = false;
  apiKeysError: string | null = null;
  apiKeysLoaded = false;
  apiKeyMessage: { kind: 'success' | 'danger' | 'info'; text: string } | null = null;
  showCreateApiKeyForm = false;
  newApiKey: OwnerApiKeyCreate = this.emptyApiKey();
  generatedApiKey = '';

  readonly HEALTH_LABEL = HEALTH_LABEL;
  readonly HEALTH_BADGE = HEALTH_BADGE;
  readonly deadNodes = deadNodes;
  readonly RATE_LIMIT_LABEL = RATE_LIMIT_LABEL;

  private destroy$ = new Subject<void>();
  /** Emits on every owner change → cancels requests of the previous owner. */
  private ownerChange$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private modalService: NgbModal,
    private ownersService: OwnersService,
    private usersService: UsersService,
    private apiKeysService: OwnerApiKeysService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.ownerId = params.get('ownerId') ?? '';
      this.resetState();
      if (this.ownerId) this.load();
    });
  }

  ngOnDestroy(): void {
    this.ownerChange$.next();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ---------------------------------------------------------------- load
  load(): void {
    this.loading = true;
    this.error = null;
    this.ownersService.ownersControllerFindOneDetailed$Response({ id: this.ownerId })
      .pipe(takeUntil(this.ownerChange$), takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const d: any = parseBody(res.body) ?? {};
          this.owner = {
            idOwner: d.idOwner || this.ownerId,
            name: d.name || '—',
            ownerCode: d.ownerCode || '',
            industry: d.industry || '',
            contactPerson: d.contactPerson || '',
            email: d.email || '',
            phone: d.phone || '',
            address: d.address || '',
            sla: normalizeSla(d.slaLevel),
            createdAt: d.createdAt || null,
            totalProjects: Number(d.statistics?.totalProjects ?? (d.projects?.length ?? 0)) || 0,
            totalSensors: Number(d.statistics?.totalSensors ?? 0) || 0
          };
          this.health = healthOf(d);
          this.projects = (Array.isArray(d.projects) ? d.projects : []).map((p: any) => {
            const h = healthOf(p);
            return {
              idProject: p.idProject,
              name: p.name || '—',
              areaType: p.areaType || '',
              status: p.status || '',
              nodeCount: Number(p.nodeCount ?? h?.nodes ?? 0) || 0,
              health: h,
              state: healthState(h)
            } as ProjectRow;
          }).sort((a: ProjectRow, b: ProjectRow) =>
            (HEALTH_ORDER[a.state] - HEALTH_ORDER[b.state]) || a.name.localeCompare(b.name, 'id'));
          this.loading = false;
          // Counts in the tab labels need both lists; they are small and scoped to this owner.
          this.loadUsers();
          this.loadApiKeys();
        },
        error: (err) => {
          this.error = err?.status === 404 ? 'Owner tidak ditemukan.' : (err?.error?.message || 'Gagal memuat detail owner.');
          this.loading = false;
        }
      });
  }

  setTab(tab: DetailTab): void { this.activeTab = tab; }

  get state(): HealthState { return healthState(this.health); }

  get attentionProjects(): ProjectRow[] {
    return this.projects.filter(p => p.state === 'problem' || p.state === 'warning');
  }

  get subtitle(): string {
    if (!this.owner) return '';
    return [this.owner.ownerCode, this.owner.industry].filter(Boolean).join(' · ');
  }

  timeAgo(at: string | null | undefined): string { return timeAgoId(at ?? null); }

  problemText(p: ProjectRow): string {
    const h = p.health;
    if (!h) return '';
    const parts: string[] = [];
    if (h.offline) parts.push(`${h.offline} node offline`);
    if (h.nodata) parts.push(`${h.nodata} node belum pernah kirim`);
    if (h.stale) parts.push(`${h.stale} node terlambat`);
    if (h.openAlerts) parts.push(`${h.openAlerts} alert terbuka`);
    return parts.join(' · ');
  }

  // ---------------------------------------------------------------- Pengguna
  loadUsers(): void {
    this.usersLoading = true;
    this.usersError = null;
    fetchAll(p => this.usersService.usersControllerFindAll$Response({ idOwner: this.ownerId, ...p }))
      .pipe(takeUntil(this.ownerChange$), takeUntil(this.destroy$))
      .subscribe({
        next: (users) => {
          this.users = users as UserResponseDto[];
          this.usersLoading = false;
          this.usersLoaded = true;
        },
        error: () => {
          this.usersError = 'Gagal memuat pengguna owner ini.';
          this.usersLoading = false;
        }
      });
  }

  openCreateUser(): void {
    const modalRef = this.modalService.open(UserModal, { size: 'lg', backdrop: 'static', keyboard: false });
    modalRef.componentInstance.mode = 'create';
    modalRef.componentInstance.user = null;
    modalRef.componentInstance.ownerId = this.ownerId;
    modalRef.componentInstance.ownerName = this.owner?.name || '';
    modalRef.result.then(
      (result) => { if (result === 'saved') this.loadUsers(); },
      () => { /* dismissed */ }
    );
  }

  openUser(user: UserResponseDto): void {
    this.router.navigate(['/admin/users', user.idUser]);
  }

  toggleUserStatus(user: UserResponseDto): void {
    const action = user.isActive ? 'nonaktifkan' : 'aktifkan';
    if (!confirm(`Yakin ${action} pengguna "${user.name || user.email}"?`)) return;
    this.usersService.usersControllerToggleActive({ id: user.idUser }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { user.isActive = !user.isActive; },
      error: (err: any) => alert(`Gagal mengubah status pengguna: ${err?.error?.message || 'coba lagi.'}`)
    });
  }

  deleteUser(user: UserResponseDto): void {
    if (!confirm(`Hapus pengguna "${user.name || user.email}"?\n\nTindakan ini tidak bisa dibatalkan.`)) return;
    this.usersService.usersControllerDelete({ id: user.idUser }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.users = this.users.filter(u => u.idUser !== user.idUser); },
      error: (err: any) => alert(`Gagal menghapus pengguna: ${err?.error?.message || 'coba lagi.'}`)
    });
  }

  // ---------------------------------------------------------------- API key
  loadApiKeys(): void {
    this.apiKeysLoading = true;
    this.apiKeysError = null;
    this.apiKeysService.list(this.ownerId)
      .pipe(takeUntil(this.ownerChange$), takeUntil(this.destroy$))
      .subscribe({
        next: (keys) => {
          this.apiKeys = keys;
          this.apiKeysLoading = false;
          this.apiKeysLoaded = true;
        },
        error: (err) => {
          this.apiKeysError = err?.error?.message || 'Gagal memuat API key owner ini.';
          this.apiKeysLoading = false;
        }
      });
  }

  toggleCreateApiKeyForm(): void {
    this.showCreateApiKeyForm = !this.showCreateApiKeyForm;
    if (this.showCreateApiKeyForm) {
      this.newApiKey = this.emptyApiKey();
      this.generatedApiKey = '';
    }
  }

  createApiKey(): void {
    if (!this.newApiKey.label?.trim()) {
      this.apiKeyMessage = { kind: 'danger', text: 'Label wajib diisi.' };
      return;
    }
    this.apiKeyMessage = { kind: 'info', text: 'Membuat API key…' };
    const dto: OwnerApiKeyCreate = { ...this.newApiKey, label: this.newApiKey.label.trim(), expiresAt: this.newApiKey.expiresAt ? `${this.newApiKey.expiresAt}T23:59:59+07:00` : null }; // valid through the end of that day (WIB), not 00:00 UTC
    this.apiKeysService.create(this.ownerId, dto).pipe(takeUntil(this.destroy$)).subscribe({
      next: (result) => {
        this.generatedApiKey = result.key;
        this.showCreateApiKeyForm = false;
        this.apiKeyMessage = { kind: 'success', text: 'API key dibuat. Salin sekarang — key tidak akan ditampilkan lagi.' };
        this.loadApiKeys();
      },
      error: (err: any) => {
        this.apiKeyMessage = { kind: 'danger', text: `Gagal membuat API key: ${err?.error?.message || 'coba lagi.'}` };
      }
    });
  }

  copyApiKey(): void {
    if (!this.generatedApiKey) return;
    navigator.clipboard.writeText(this.generatedApiKey).then(
      () => { this.apiKeyMessage = { kind: 'success', text: 'API key disalin ke clipboard.' }; },
      () => { this.apiKeyMessage = { kind: 'danger', text: 'Gagal menyalin. Salin manual dari kotak di atas.' }; }
    );
  }

  toggleApiKeyActive(key: TenantApiKeyResponse): void {
    const next = !key.isActive;
    if (!confirm(`Yakin ${next ? 'aktifkan' : 'nonaktifkan'} API key "${key.label}"?`)) return;
    this.apiKeysService.setActive(this.ownerId, key.idApiKey, next).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        key.isActive = next;
        this.apiKeyMessage = { kind: 'success', text: `API key "${key.label}" ${next ? 'diaktifkan' : 'dinonaktifkan'}.` };
      },
      error: (err: any) => {
        this.apiKeyMessage = { kind: 'danger', text: `Gagal mengubah API key: ${err?.error?.message || 'coba lagi.'}` };
      }
    });
  }

  regenerateApiKey(key: TenantApiKeyResponse): void {
    if (!confirm(`Buat ulang API key "${key.label}"?\n\nKey lama LANGSUNG tidak berlaku.`)) return;
    this.apiKeysService.regenerate(this.ownerId, key.idApiKey).pipe(takeUntil(this.destroy$)).subscribe({
      next: (result) => {
        this.generatedApiKey = result.key;
        this.apiKeyMessage = { kind: 'success', text: 'API key baru dibuat. Salin sekarang — key tidak akan ditampilkan lagi.' };
        this.loadApiKeys();
      },
      error: (err: any) => {
        this.apiKeyMessage = { kind: 'danger', text: `Gagal membuat ulang API key: ${err?.error?.message || 'coba lagi.'}` };
      }
    });
  }

  revokeApiKey(key: TenantApiKeyResponse): void {
    if (!confirm(`Cabut PERMANEN API key "${key.label}"?\n\nTindakan ini tidak bisa dibatalkan.`)) return;
    this.apiKeysService.revoke(this.ownerId, key.idApiKey).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.apiKeys = this.apiKeys.filter(k => k.idApiKey !== key.idApiKey);
        this.apiKeyMessage = { kind: 'success', text: `API key "${key.label}" dicabut.` };
      },
      error: (err: any) => {
        this.apiKeyMessage = { kind: 'danger', text: `Gagal mencabut API key: ${err?.error?.message || 'coba lagi.'}` };
      }
    });
  }

  apiKeyStatus(key: TenantApiKeyResponse): { cls: string; text: string } {
    if (!key.isActive) return { cls: 'bg-secondary-subtle text-secondary', text: 'Nonaktif' };
    if (key.expiresAt && Date.now() > new Date(key.expiresAt).getTime()) {
      return { cls: 'bg-warning-subtle text-warning', text: 'Kedaluwarsa' };
    }
    return { cls: 'bg-success-subtle text-success', text: 'Aktif' };
  }

  // ---------------------------------------------------------------- private
  /** The component is reused when navigating owner → owner: wipe EVERYTHING of the previous one. */
  private resetState(): void {
    this.ownerChange$.next();
    this.activeTab = 'summary';
    this.loading = false;
    this.error = null;
    this.owner = null;
    this.health = null;
    this.projects = [];
    this.users = [];
    this.usersLoading = false;
    this.usersError = null;
    this.usersLoaded = false;
    this.apiKeys = [];
    this.apiKeysLoading = false;
    this.apiKeysError = null;
    this.apiKeysLoaded = false;
    this.apiKeyMessage = null;
    this.showCreateApiKeyForm = false;
    this.newApiKey = this.emptyApiKey();
    this.generatedApiKey = '';
  }

  private emptyApiKey(): OwnerApiKeyCreate {
    return { label: '', description: '', expiresAt: null, rateLimitPlan: 'basic' as RateLimitPlan };
  }
}
