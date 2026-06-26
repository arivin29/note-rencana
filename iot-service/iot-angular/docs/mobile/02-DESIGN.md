# 02 — Design (Arsitektur & Desain)

Modul: **Mobile View** (`/mobile/*`). Baca [01-REQUIREMENTS.md](./01-REQUIREMENTS.md) lebih dulu.

---

## 1. Gambaran besar

```
                    ┌─────────────────────────────────────┐
                    │            SHARED LAYER             │  ← dipakai dua sisi
                    │  sdk/core (generated)  services/    │
                    │  models/  guards  JwtInterceptor    │
                    └───────────────┬─────────────────────┘
                ┌───────────────────┴────────────────────┐
                ▼                                          ▼
      ┌───────────────────┐                     ┌────────────────────┐
      │   DESKTOP (ada)   │                     │   MOBILE (baru)    │
      │  Color Admin shell│                     │  MobileLayout shell│
      │  sidebar + header │                     │  header tipis +    │
      │  pages/iot/*      │                     │  bottom-nav        │
      │  /iot/**          │                     │  mobile/*          │
      └───────────────────┘                     └────────────────────┘
                \________________  switch  ________________/
                         (ViewModeService + localStorage)
```

Inti desain: **satu data layer, dua presentation shell.** Yang membedakan hanya tampilan + navigasi. Logika bisnis hidup di `services/` dan dipanggil dua-duanya.

---

## 2. Struktur folder (baru)

```
src/app/
  mobile/
    mobile.module.ts                 # NgModule (declarations + imports SharedComponentsModule)
    mobile-routing.module.ts         # child routes di bawah MobileLayoutComponent

    layout/
      mobile-layout/                  # SHELL: set AppSettings (hide desktop chrome) + restore
        mobile-layout.component.ts
        mobile-layout.component.html  # <mobile-header> <router-outlet> <mobile-bottom-nav>
        mobile-layout.component.scss
      mobile-header/                  # judul + tombol switch + avatar/menu
      mobile-bottom-nav/              # tab: Dashboard | Nodes | Alerts | Profil

    dashboard/      mobile-dashboard/   # ringkasan count + list singkat
    nodes/          mobile-nodes-list/  mobile-node-detail/
    alerts/         mobile-alerts/
    profile/        mobile-profile/
    shared/                            # komponen presentational khusus mobile (opsional)
      mobile-status-pill/  mobile-stat-card/  mobile-sparkline/

src/app/services/
  view-mode.service.ts               # BARU — state mode desktop|mobile|auto (shared)
```

Catatan:
- Komponen mobile **presentational**. Data diambil dari service existing (mis. `NodesService` dari `src/sdk/core` atau service domain di `services/`).
- `mobile/shared/` hanya untuk UI kecil yang dipakai antar-layar mobile. Jangan taruh logika domain di sini.

---

## 3. Mobile shell (MobileLayoutComponent)

Desktop memakai Color Admin (`app.component.html`) yang menampilkan `<header>`, `<sidebar>`, `<top-nav>` berdasarkan flag `AppSettings`. Mobile **menumpang shell yang sama** tapi mematikan chrome desktop dan menggambar chrome-nya sendiri.

### Strategi (memanfaatkan AppSettings — tidak menyentuh app.component.html)
`MobileLayoutComponent` membungkus seluruh route mobile. Saat aktif:

```ts
// pseudocode
ngOnInit() {
  // simpan state chrome desktop
  this.prev = {
    header:  this.appSettings.appHeaderNone,
    sidebar: this.appSettings.appSidebarNone,
    topNav:  this.appSettings.appTopNav,
    fullW:   this.appSettings.appContentFullWidth,
    fullH:   this.appSettings.appContentFullHeight,
  };
  // matikan chrome desktop, konten full
  this.appSettings.appHeaderNone = true;
  this.appSettings.appSidebarNone = true;
  this.appSettings.appTopNav = false;
  this.appSettings.appContentFullWidth = true;
  this.appSettings.appContentFullHeight = true;
}
ngOnDestroy() {
  // WAJIB restore — cegah chrome bocor ke desktop
  Object.assign(this.appSettings, { ... this.prev ... });
}
```

Template shell mobile:
```html
<div class="mobile-shell" [attr.data-bs-theme]="...">
  <mobile-header [title]="pageTitle"></mobile-header>
  <main class="mobile-content"><router-outlet></router-outlet></main>
  <mobile-bottom-nav></mobile-bottom-nav>
</div>
```

> **Risiko utama** (lihat 01 §8): kalau lupa restore di `ngOnDestroy`, flag mobile kebawa saat user switch ke desktop → layout desktop rusak. Restore wajib + diuji (AC6).

---

## 4. Mekanisme View Switch

### 4.1 ViewModeService (shared, BehaviorSubject)
```ts
type ViewMode = 'auto' | 'desktop' | 'mobile';

@Injectable({ providedIn: 'root' })
class ViewModeService {
  private key = 'devetek.viewMode';
  private _mode$ = new BehaviorSubject<ViewMode>(this.read());     // dari localStorage, default 'auto'
  readonly mode$ = this._mode$.asObservable();

  resolveEffective(): 'desktop' | 'mobile' {                       // mode efektif sekarang
    const m = this._mode$.value;
    if (m === 'auto') return this.isMobileViewport() ? 'mobile' : 'desktop';
    return m;
  }
  set(mode: ViewMode): void { localStorage.setItem(this.key, mode); this._mode$.next(mode); }
  isMobileViewport(): boolean { return window.matchMedia('(max-width: 767.98px)').matches; }
  private read(): ViewMode { return (localStorage.getItem(this.key) as ViewMode) || 'auto'; }
}
```

### 4.2 Aksi switch (tombol)
- Tombol di **mobile-header** → `viewMode.set('desktop'); router.navigateByUrl('/iot/dashboard')`.
- Tombol di **desktop header/top-nav** → `viewMode.set('mobile'); router.navigateByUrl('/mobile/dashboard')`.
- Set eksplisit (`desktop`/`mobile`) supaya pilihan menetap; user tidak "ketarik balik" oleh auto.

### 4.3 Auto-routing saat masuk app
Pakai redirect terkontrol di root, **tanpa** mengganggu deep-link yang sudah spesifik:
- Jika URL awal `'/'` (atau `'/iot/dashboard'` default) **dan** `resolveEffective() === 'mobile'` → redirect `/mobile/dashboard`.
- Jika user membuka `/mobile/...` tapi efektif `desktop` (mis. buka di laptop) → biarkan (jangan paksa), cukup tampilkan tombol switch. (Keputusan: jangan agresif redirect; hormati URL eksplisit — lihat FR9.)

Implementasi opsi (pilih saat spec):
- **(A) CanMatch/Guard di root redirect route** — paling Angular-idiomatic.
- **(B) Logika kecil di AppComponent.ngOnInit** — cek `router.url` + `resolveEffective()` lalu `navigateByUrl`.

Rekomendasi: **(A)** untuk yang `'' redirectTo`, fallback **(B)** bila perlu.

---

## 5. Routing

Tambah di `app-routing.module.ts` (lazy, guarded):
```ts
{
  path: 'mobile',
  loadChildren: () => import('./mobile/mobile.module').then(m => m.MobileModule),
  canActivate: [AuthGuard],
  data: { title: 'Mobile' }
}
```

`mobile-routing.module.ts` (child di bawah MobileLayout):
```ts
const routes: Routes = [
  { path: '', component: MobileLayoutComponent, children: [
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    { path: 'dashboard', component: MobileDashboardComponent, data: { title: 'Dashboard' } },
    { path: 'nodes',      component: MobileNodesListComponent, data: { title: 'Perangkat' } },
    { path: 'nodes/:id',  component: MobileNodeDetailComponent, data: { title: 'Detail Perangkat' } },
    { path: 'alerts',     component: MobileAlertsComponent, data: { title: 'Peringatan' } },
    { path: 'profile',    component: MobileProfileComponent, data: { title: 'Profil' } },
  ]},
];
```

Konsistensi: pola sama dengan modul existing (`nodes.module.ts` dll) — lazy, `data.title`, role rule bila perlu.

---

## 6. Reuse vs Buat-baru (aturan tegas)

| Lapisan | Aksi |
|---------|------|
| SDK (`src/sdk/core`) | **Reuse**. Jangan edit (generated). |
| Domain services (`services/`, `*.service.ts`) | **Reuse**. Bila ada logika di komponen desktop yang perlu dipakai mobile → refactor ke service dulu. |
| Models / DTO | **Reuse**. |
| Guards / Interceptor | **Reuse**. |
| Tema / token SCSS (`--bs-theme`, status colors) | **Reuse**. |
| Shell (header/sidebar desktop) | **Tidak dipakai** di mobile; mobile punya shell sendiri. |
| Komponen tampilan (list/detail/dashboard) | **Buat baru** versi mobile (lite), presentational saja. |

Smell test: kalau Anda menyalin blok `subscribe(...) { res.body → JSON.parse → .data }` ke komponen mobile, itu sinyal logika harus diangkat ke service.

---

## 7. Tema & UX mobile

- **Header tipis:** judul halaman (dari `data.title`) + tombol switch (ikon `fa-desktop`) + avatar/menu.
- **Bottom-nav:** 4 tab maksimal (Dashboard, Perangkat, Peringatan, Profil), ikon FontAwesome 6, indikator aktif pakai `--bs-theme`.
- **List = card stack** (bukan tabel). Status pakai pill warna (success/warning/danger).
- **Detail = section vertikal** ringkas; angka besar, label kecil.
- **Dark mode:** ikut `data-bs-theme` existing.
- **Loading/empty/error:** komponen state konsisten (skeleton/spinner ringan).

---

## 8. Dampak ke kode existing (minimal & aman)

1. `app-routing.module.ts` — tambah 1 route `mobile` (lazy). *(tidak mengubah route lain)*
2. `services/view-mode.service.ts` — file baru.
3. Tombol switch — sisipkan di komponen desktop `header`/`top-nav` (tambah 1 tombol kecil, non-breaking).
4. (Opsional) `AppComponent.ngOnInit` — logika auto-redirect bila dipilih opsi (B).
5. Modul `mobile/` — seluruhnya baru, tidak menyentuh `pages/iot/*`.

Tidak ada perubahan backend, SDK, atau kontrak API pada fase desain ini.
</content>
