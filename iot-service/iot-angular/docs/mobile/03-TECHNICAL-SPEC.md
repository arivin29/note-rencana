# 03 — Technical Spec

Modul: **Mobile View** (`/mobile/*`). Baca [02-DESIGN.md](./02-DESIGN.md) lebih dulu. Dokumen ini turun ke level file, interface, dan spec per layar. Semua mengikuti konvensi `ui-coding-style` (NgModule `standalone: false`, kebab-case, SDK + kontrak `{data,meta}`, RxJS, `--bs-theme`).

---

## 1. Daftar artefak (file baru)

| File | Tipe | Keterangan |
|------|------|------------|
| `src/app/mobile/mobile.module.ts` | NgModule | declare semua komponen mobile; import `SharedComponentsModule`, `RouterModule`, `FormsModule` |
| `src/app/mobile/mobile-routing.module.ts` | Routing | child routes di bawah `MobileLayoutComponent` |
| `src/app/mobile/layout/mobile-layout/*` | Component | shell: set/restore `AppSettings`, render header + outlet + bottom-nav |
| `src/app/mobile/layout/mobile-header/*` | Component | judul + tombol switch + menu profil |
| `src/app/mobile/layout/mobile-bottom-nav/*` | Component | tab navigasi (routerLink + routerLinkActive) |
| `src/app/mobile/dashboard/mobile-dashboard/*` | Component | ringkasan count + list singkat |
| `src/app/mobile/nodes/mobile-nodes-list/*` | Component | card stack + search |
| `src/app/mobile/nodes/mobile-node-detail/*` | Component | status + channel values (+ sparkline opsional) |
| `src/app/mobile/alerts/mobile-alerts/*` | Component | alert aktif + acknowledge |
| `src/app/mobile/profile/mobile-profile/*` | Component | info user + logout + switch |
| `src/app/mobile/shared/mobile-status-pill/*` | Component | pill warna status |
| `src/app/mobile/shared/mobile-stat-card/*` | Component | kartu angka ringkas |
| `src/app/services/view-mode.service.ts` | Service | state mode desktop/mobile/auto (shared) |

File yang **diubah** (minimal, non-breaking):
- `src/app/app-routing.module.ts` → +1 route `mobile` (lazy).
- `src/app/components/header/*` dan/atau `components/top-nav/*` → +1 tombol switch.
- (opsional) `src/app/app.component.ts` → auto-redirect bila pakai opsi (B).

---

## 2. ViewModeService — interface final

```ts
export type ViewMode = 'auto' | 'desktop' | 'mobile';

@Injectable({ providedIn: 'root' })
export class ViewModeService {
  private readonly KEY = 'devetek.viewMode';
  private readonly _mode$ = new BehaviorSubject<ViewMode>(this.read());
  readonly mode$: Observable<ViewMode> = this._mode$.asObservable();

  get mode(): ViewMode { return this._mode$.value; }
  set(mode: ViewMode): void { localStorage.setItem(this.KEY, mode); this._mode$.next(mode); }

  /** Mode efektif sekarang (resolve 'auto' berdasarkan viewport). */
  resolveEffective(): 'desktop' | 'mobile' {
    return this.mode === 'auto'
      ? (this.isMobileViewport() ? 'mobile' : 'desktop')
      : this.mode;
  }

  isMobileViewport(): boolean {
    return window.matchMedia('(max-width: 767.98px)').matches; // breakpoint Bootstrap md
  }

  private read(): ViewMode {
    const v = localStorage.getItem(this.KEY) as ViewMode | null;
    return v === 'desktop' || v === 'mobile' || v === 'auto' ? v : 'auto';
  }
}
```

Aksi switch:
```ts
toDesktop() { this.viewMode.set('desktop'); this.router.navigateByUrl('/iot/dashboard'); }
toMobile()  { this.viewMode.set('mobile');  this.router.navigateByUrl('/mobile/dashboard'); }
```

---

## 3. MobileLayoutComponent — spec

Tanggung jawab: kelola chrome (`AppSettings`) + susun shell. **Tidak** fetch data domain.

```ts
@Component({ selector: 'mobile-layout', templateUrl: './mobile-layout.component.html',
  styleUrls: ['./mobile-layout.component.scss'], standalone: false })
export class MobileLayoutComponent implements OnInit, OnDestroy {
  private prev!: Partial<AppSettings>;
  constructor(public appSettings: AppSettings) {}

  ngOnInit(): void {
    this.prev = {
      appHeaderNone: this.appSettings.appHeaderNone,
      appSidebarNone: this.appSettings.appSidebarNone,
      appTopNav: this.appSettings.appTopNav,
      appContentFullWidth: this.appSettings.appContentFullWidth,
      appContentFullHeight: this.appSettings.appContentFullHeight,
    };
    this.appSettings.appHeaderNone = true;
    this.appSettings.appSidebarNone = true;
    this.appSettings.appTopNav = false;
    this.appSettings.appContentFullWidth = true;
    this.appSettings.appContentFullHeight = true;
  }
  ngOnDestroy(): void { Object.assign(this.appSettings, this.prev); } // WAJIB restore
}
```
> Verifikasi nama properti `AppSettings` saat implementasi (`src/app/service/app-settings.service.ts`). Daftar di atas diambil dari penggunaan di `app.component.html`.

Judul halaman: ambil dari `ActivatedRoute.firstChild.data.title` (subscribe `router.events`/`NavigationEnd`) → diteruskan ke `mobile-header`.

---

## 4. Pola komponen layar (template seragam)

Semua layar data mengikuti pola `ui-coding-style`:
```ts
loading = false; error: string | null = null; items: NodeResponseDto[] = [];
private destroy$ = new Subject<void>();

ngOnInit() { this.load(); }
load() {
  this.loading = true; this.error = null;
  this.nodesService.nodesControllerFindAll$Response({ page: 1, limit: 50, search: this.search })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (res) => { let b: any = res.body; if (typeof b === 'string') b = JSON.parse(b);
        this.items = (b.data || []) as NodeResponseDto[]; this.loading = false; },
      error: (err) => { this.error = err?.message || 'Gagal memuat'; this.loading = false; },
    });
}
ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }
```
Aturan: parsing kontrak `{data,meta}` **idealnya** dibungkus di service domain (mis. method `list()` yang return `Observable<{data,meta}>`), supaya komponen mobile & desktop sama-sama tinggal pakai. Bila service existing belum menyediakannya, refactor di sana (bukan duplikat di komponen).

---

## 5. Spec per layar

### 5.1 Mobile Dashboard (`/mobile/dashboard`) — Must
- **Tampil:** kartu angka — Node Online, Node Offline, Alert Aktif; list "perlu perhatian" (node offline / alert terbaru, maks 5).
- **Data:** count node by `connectivity_status`/`status`, count/last alerts. Sumber: `NodesService` + service alerts.
- **Aksi:** tap kartu → ke `/mobile/nodes?filter=...` atau `/mobile/alerts`.
- **Verifikasi data:** apakah ada endpoint summary/aggregate? Bila tidak, hitung dari list (limit wajar) atau minta endpoint count. **TODO konfirmasi.**

### 5.2 Mobile Nodes List (`/mobile/nodes`) — Must
- **Tampil:** card per node — nama/code, status pill (online/offline), `last_seen_at`, project/owner (sesuai role).
- **Fitur:** search (debounce), pull-to-refresh / tombol refresh, infinite scroll atau "muat lebih" (pakai `meta.totalPages`).
- **Data:** `NodesService.nodesControllerFindAll$Response({page,limit,search})`.
- **Aksi:** tap → `/mobile/nodes/:id`.

### 5.3 Mobile Node Detail (`/mobile/nodes/:id`) — Must
- **Tampil:** header status (online/offline, last seen, firmware), daftar **channel/sensor** dengan nilai terbaru + unit, section telemetry singkat (opsional sparkline).
- **Data:** `NodesService.findOne` + channel/telemetry terakhir per channel. **Verifikasi**: endpoint nilai terbaru per channel (`sensor_channels` + last `sensor_logs`). **TODO konfirmasi** shape & endpoint.
- **Aksi (fase lanjut):** kontrol relay / command (kalau ada endpoint command node).

### 5.4 Mobile Alerts (`/mobile/alerts`) — Must
- **Tampil:** list alert aktif — severity, node, pesan, waktu.
- **Fitur:** filter aktif/semua; acknowledge.
- **Data + aksi ack:** **TODO konfirmasi** endpoint list alert & acknowledge (`alert_events`). Optimistic update + refetch.

### 5.5 Mobile Profile (`/mobile/profile`) — Could
- **Tampil:** nama/email/role/owner (dari `AuthService`).
- **Aksi:** switch ke desktop, logout.

---

## 6. Tombol switch di desktop (sisipan)
Di `components/header` atau `components/top-nav`, tambah tombol kecil:
```html
<button class="btn btn-sm btn-outline-theme" (click)="goMobile()" title="Tampilan Mobile">
  <i class="fa fa-mobile-screen fa-fw"></i>
</button>
```
```ts
constructor(private viewMode: ViewModeService, private router: Router) {}
goMobile() { this.viewMode.set('mobile'); this.router.navigateByUrl('/mobile/dashboard'); }
```
Non-breaking: hanya menambah 1 tombol.

---

## 7. Auto-redirect masuk app (opsi A — direkomendasikan)
Ubah default redirect root agar sadar mode. Contoh dengan `CanMatch` functional guard:
```ts
// '' → arahkan ke mobile/desktop sesuai resolveEffective()
export const rootRedirectGuard: CanMatchFn = () => {
  const vm = inject(ViewModeService); const router = inject(Router);
  return vm.resolveEffective() === 'mobile'
    ? router.parseUrl('/mobile/dashboard')
    : router.parseUrl('/iot/dashboard');
};
```
Pasang pada route `{ path: '', canMatch: [rootRedirectGuard], children: [] }` atau sesuaikan dengan struktur redirect existing (`{ path: '', redirectTo: '/iot/dashboard' }`). Jangan paksa-redirect URL yang sudah eksplisit (`/mobile/...` atau `/iot/...`).

---

## 8. Rencana fase implementasi

> **Fase 1–5 semuanya READ-ONLY.** Tidak ada aksi tulis. Aksi tulis (kontrol device, ack/snooze, ganti password) = **Fase Lanjut**, dikerjakan setelah read-only solid.

| Fase | Deliverable (read-only) | Acceptance |
|------|-------------------------|------------|
| **F0 — Skeleton** | `mobile.module` + routing + `MobileLayout` + header + bottom-nav + `ViewModeService` + `ProjectContextService` + tombol switch + auto-redirect + login mobile (view) | AC1, AC2, AC6, AC7 |
| **F1 — Nodes** | Nodes list + node detail (read) + channel detail (chart+rows) + `AutoRefreshService` | AC3, AC4 |
| **F2 — Alerts (lihat)** | Alerts list aktif + riwayat (tanpa ack/snooze) | — |
| **F3 — Dashboard** | Kartu ringkasan + list perlu-perhatian | US6 |
| **F4 — Project detail** | Tab Detail/Node/Channel-last + Peta (Leaflet lazy) + SCADA view (lazy, read-only) | — |
| **F5 — Polish** | Profile (view), search, pull-to-refresh, empty/skeleton/offline states | NFR3, A5 |
| **Fase Lanjut** | (write) kontrol device SMS/MQTT, ack/snooze alert, ganti password | — |

Tiap fase: selesaikan **verifikasi endpoint** (bagian TODO §5 / 06 §5) sebelum coding layar tsb.

---

## 9. Definition of Done (per komponen)
- [ ] `standalone: false`, terdaftar di `MobileModule`.
- [ ] Data via service existing (tanpa duplikasi fetch/parse/RBAC).
- [ ] State loading / error / empty ditangani.
- [ ] Subscriptions di-unsubscribe (`takeUntil(destroy$)`).
- [ ] Tema `--bs-theme` + FontAwesome 6, dark-mode aman, touch target ≥44px.
- [ ] Tidak meregresikan desktop (chrome `AppSettings` ter-restore).
- [ ] Role/guard konsisten dengan desktop.

---

## 10. Pertanyaan terbuka
**Endpoint data: ✅ SUDAH DIVERIFIKASI** — semua ada. Mapping lengkap endpoint→layer + bentuk response ada di [06-OPEN-ITEMS.md §5](./06-OPEN-ITEMS.md). Ringkas: Node detail=`/nodes/{id}/dashboard`, chart=`/sensor-logs/telemetry/chart`, rows=`/sensor-channels/{id}/readings`, channel-overview project=`/sensor-channels/overview?idProject=`, peta=`/webgis/core/{projectId}/nodes`, SCADA=`/scada/diagrams/{id}/runtime`, summary=`/nodes/statistics/overview`, alerts=`/alert-events`. **Tidak ada WS/SSE → auto-reload polling.**

Sisa pertanyaan **non-data** (tidak memblok):
1. Filter alert by project/node belum ada di `/alert-events` → filter client-side dulu, atau minta param `idProject` ke backend? (06 §5 catatan 2)
2. Properti pasti `AppSettings` untuk full-width/height — validasi nama saat coding di `app-settings.service.ts`.
3. Service worker — perlukah route `/mobile` masuk precache/manifest shortcut? (06/D1)
4. Variasi wrapper response (`alert-events` nested ganda, `overview` pakai `total/limit`) → bungkus parsing per-bentuk di service. (06 §5 catatan 1)
</content>
