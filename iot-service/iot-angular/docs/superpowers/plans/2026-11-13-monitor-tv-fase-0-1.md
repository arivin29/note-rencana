# Monitor TV — Fase 0 (Fondasi) + Fase 1 (Layar Penuh & Layar Target) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Semua dashboard Widget Builder/Monitor memperbarui datanya sendiri, bisa masuk Layar Penuh tanpa sidebar apa pun, dan dashboard bertanda "TV 16:9" muat satu layar TV (1080p maupun 4K) tanpa scroll.

**Architecture:** Logika murni (rentang waktu bergulir, geometri layar target) dipisah ke `widget-builder/utils/*.ts` dan diuji dengan `node:test` via `tsx`. `LayoutStateService` (root) memegang status "immersive" yang dibaca shell app, workspace proyek, dan dashboard-view. Mode TV = kotak 16:9 yang di-fit ke area tersedia; tinggi baris gridster dihitung dari tinggi kotak ÷ jumlah baris desain; teks diskalakan lewat CSS var `--wb-scale` = lebar kotak ÷ 1920 (tanpa `transform`, jadi gridster drag tetap benar dan grafik tetap tajam di 4K).

**Tech Stack:** Angular 20 (NgModule, `standalone:false`), angular-gridster2 ^20.2, ngx-echarts 20 / ECharts 5.6, Bootstrap 5, Goravel backend (tidak berubah).

**Spec:** `iot-angular/docs/design/2026-11-13-monitor-tv-design.md` (§6.1, §6.2). Skill: `widget-builder` (+ `references/backlog.md`), `ui-coding-style`.

## Global Constraints
- NgModule non-standalone (`standalone: false`); daftarkan komponen baru di `widget-builder.module.ts`.
- Teks UI baru Bahasa Indonesia. Ikon FontAwesome/bootstrap-icons yang sudah dipakai file itu.
- Tidak ada data palsu; gagal = pesan jujur + tombol "Coba lagi".
- Tidak ada migrasi DB; setelan disimpan di `custom_dashboards.layout_config` (jsonb), `time_range`, `refresh_interval` lewat `PUT /api/widget-builder/dashboards/{id}` yang sudah ada. **Saat menulis `layoutConfig`, gabungkan dengan nilai lama — jangan menghapus `layoutConfig.variables`.**
- Jangan edit SDK generated kecuali menambah field manual (regen rusak).
- Preset layar: `auto` (perilaku sekarang) | `tv-16-9` (lebar desain 1920, rasio 16:9 — dipakai untuk TV 1080p dan 4K) | `custom` (`width`×`height` bebas, mis. video wall). Baris desain default mode TV = **12**.
- Tes logika murni: `npx --yes tsx@4.19.2 --test <file>` (Karma proyek rusak: `karma-coverage` hilang — jangan diperbaiki di plan ini).
- Build check: `npx tsc -p tsconfig.app.json --noEmit` di `iot-angular` harus bersih.
- Commit: pesan diakhiri `Co-Authored-By: Muh Arifin <11455704+arivin29@users.noreply.github.com>`; tanpa atribusi Claude. Git root = `pra-project`.

## Review Focus
1. **Layar penuh ditutup lewat Esc browser** (bukan tombol) → sidebar app & workspace harus kembali; tidak boleh tersisa layout tanpa menu.
2. **Pindah halaman saat immersive** (mis. sesi habis → `/auth/login`, atau klik link) → immersive harus dilepas; halaman login tidak boleh tanpa header selamanya.
3. **Refresh gagal sementara** (jaringan putus 1 menit) → widget tetap menampilkan data terakhir + tanda gagal, lalu pulih sendiri di tick berikutnya; tidak boleh kosong/berkedip.
4. **Rentang waktu absolut/custom** + auto-refresh → rentang TIDAK boleh bergeser (hanya rentang relatif "Last X" yang bergulir).
5. **Dashboard TV di layar non-16:9** (laptop 1366×768, portrait) → kotak 16:9 letterbox di tengah, tidak terpotong, tidak scroll; widget yang posisinya melewati baris 12 ditandai di mode edit.

---

### Task 1: Util rentang waktu & refresh (logika murni)

**Files:**
- Create: `src/app/pages/iot/widget-builder/utils/dashboard-time.ts`
- Test: `src/app/pages/iot/widget-builder/utils/dashboard-time.test.ts`

**Interfaces:**
- Produces:
  - `findPreset(value: string): { label: string; value: string; duration: number } | null` — cari di `TIME_RANGE_PRESETS` (import dari `../models/widget.models`).
  - `rollRange(preset: string, now: number, current: { from: number; to: number }): { from: number; to: number }` — preset relatif → `{from: now - duration, to: now}`; preset `'custom'`/tak dikenal → `current` apa adanya.
  - `normalizeRefresh(seconds: unknown): number` — kembalikan nilai bila ada di `REFRESH_INTERVALS`, selain itu `0`.
  - `defaultPresetFrom(timeRange: string | null | undefined): string` — nilai `custom_dashboards.time_range` ('6h','24h',…) bila valid, selain itu `'24h'`.

- [ ] **Step 1: Write the failing tests**
```ts
import { test } from 'node:test'; import assert from 'node:assert/strict';
import { rollRange, normalizeRefresh, defaultPresetFrom, findPreset } from './dashboard-time';
const NOW = 1_700_000_000_000;
test('relative preset rolls to now', () => {
  assert.deepEqual(rollRange('6h', NOW, { from: 0, to: 1 }), { from: NOW - 6 * 3600_000, to: NOW });
});
test('custom range never moves', () => {
  assert.deepEqual(rollRange('custom', NOW, { from: 10, to: 20 }), { from: 10, to: 20 });
});
test('unknown preset keeps current', () => {
  assert.deepEqual(rollRange('abc', NOW, { from: 1, to: 2 }), { from: 1, to: 2 });
});
test('refresh only allowed values', () => {
  assert.equal(normalizeRefresh(60), 60); assert.equal(normalizeRefresh(7), 0); assert.equal(normalizeRefresh('x'), 0);
});
test('default preset from dashboard time_range', () => {
  assert.equal(defaultPresetFrom('6h'), '6h'); assert.equal(defaultPresetFrom(''), '24h'); assert.equal(defaultPresetFrom(null), '24h');
});
test('findPreset', () => { assert.equal(findPreset('24h')?.duration, 86_400_000); assert.equal(findPreset('zz'), null); });
```
- [ ] **Step 2:** Run `cd iot-angular && npx --yes tsx@4.19.2 --test src/app/pages/iot/widget-builder/utils/dashboard-time.test.ts` → FAIL (module not found).
- [ ] **Step 3:** Implement the four functions in `dashboard-time.ts` (no Angular imports).
- [ ] **Step 4:** Re-run → all PASS.
- [ ] **Step 5:** Commit `feat(widget-builder): util rentang waktu bergulir & validasi refresh`.

---

### Task 2: Auto-refresh nyata + default dari dashboard

**Files:**
- Modify: `src/app/pages/iot/widget-builder/dashboard-view/dashboard-view.component.ts` (fields 68-79, `loadDashboard` 197-272, `refreshWidget` 365-368, time methods 469-511, `getTimeFrom/To` ~713)
- Modify: `src/app/pages/iot/widget-builder/models/widget.models.ts` (`Dashboard`: tambah `timeRange?: string; refreshInterval?: number; layoutConfig?: Record<string, any>`)

**Interfaces:**
- Consumes: Task 1 `rollRange`, `normalizeRefresh`, `defaultPresetFrom`, `findPreset`.
- Produces: `DashboardViewComponent.refreshAllWidgets(): void` (menggeser rentang relatif → widget reload via `ngOnChanges` input `timeFrom/timeTo`); `lastRefresh: Date`; `dashboard.layoutConfig/timeRange/refreshInterval` terisi dari respons.

- [ ] **Step 1:** Tambah `private refreshTimer$ = new Subject<void>()`; `setupAutoRefresh()` memakai `takeUntil(merge(this.refreshTimer$, this.destroy$))` dan memanggil `this.refreshTimer$.next()` (BUKAN `destroy$.next()`) untuk membatalkan timer lama.
- [ ] **Step 2:** `refreshAllWidgets()`: `const r = rollRange(this.selectedTimePreset, Date.now(), {from: this.timeRange.from.getTime(), to: this.timeRange.to.getTime()})`; bila preset relatif → `this.timeRange = {...this.timeRange, from: new Date(r.from), to: new Date(r.to)}`; bila custom → tetap, tapi paksa reload dengan menaikkan `refreshNonce` (number) yang di-pass ke container (Task 3). Set `lastRefresh`. Hapus `console.log` mockup; hapus isi mockup `refreshWidget` (container sudah reload sendiri lewat menunya).
- [ ] **Step 3:** Di `loadDashboard`, isi `this.dashboard.timeRange/refreshInterval/layoutConfig`; sekali per load set `selectedTimePreset = defaultPresetFrom(data.timeRange)`, rentang dari `findPreset`, `refreshInterval = normalizeRefresh(data.refreshInterval)`, lalu `setupAutoRefresh()`. Perubahan di toolbar = sesi saja (tidak disimpan) — default diubah lewat Pengaturan Dashboard (Task 8).
- [ ] **Step 4:** Verify: `npx tsc -p tsconfig.app.json --noEmit` bersih. Buka `http://localhost:4200/iot/projects/1414bdba-000b-4e17-b877-557136f8ef2a/monitor/635a8cef-fadc-46fc-84f5-c5c42342bfea`, set auto refresh 10 s → Network tab menunjukkan `query/execute` berulang tiap 10 s dan nilai gauge berubah; pilih rentang absolut → request tetap jalan dengan `from/to` yang sama.
- [ ] **Step 5:** Commit `fix(widget-builder): auto-refresh benar-benar memuat ulang widget`.

---

### Task 3: Reload tanpa kedip, status per widget, indikator "Diperbarui"

**Files:**
- Modify: `src/app/pages/iot/widget-builder/components/widget-container/widget-container.component.{ts,html,css}`
- Modify: `dashboard-view.component.{ts,html}`

**Interfaces:**
- Consumes: Task 2 `refreshNonce`.
- Produces (container): `@Input() refreshNonce = 0` (perubahan → `loadWidgetData()`); `@Output() loadResult = new EventEmitter<{ ok: boolean; at: Date }>()`; field `stale: boolean`, `lastLoadedAt: Date | null`.
- Produces (view): `failStreak: number` (refresh global berturut-turut dengan ≥1 widget gagal), `lastSuccessAt: Date | null`.

- [ ] **Step 1:** Container: `loading` spinner hanya bila `chartData` masih kosong (load pertama); reload berikutnya pakai `refreshing = true` (tanpa menyembunyikan chart). Gagal saat sudah ada data → simpan data lama, `stale = true`, tampilkan badge kecil di header panel `⚠ gagal memuat · Coba lagi` (title berisi pesan error); gagal tanpa data → state error yang ada (teks "Coba lagi"). Sukses → `stale=false`, `lastLoadedAt=new Date()`. Emit `loadResult` di kedua cabang (single & multi-query).
- [ ] **Step 2:** View: kumpulkan `loadResult`; tampilkan di toolbar (dan header immersive Task 6) teks `Diperbarui HH:mm:ss` dari `lastSuccessAt`; bila `failStreak > 2` tampilkan teks peringatan `Gagal memperbarui data sejak HH:mm` (kelas `text-warning`).
- [ ] **Step 3:** Verify: `tsc` bersih; dengan auto-refresh 10 s, matikan backend 30 s (`kill` proses :3000) → widget tetap menampilkan angka lama + badge, header menunjukkan peringatan; hidupkan lagi → pulih tanpa reload halaman.
- [ ] **Step 4:** Commit `feat(widget-builder): refresh tanpa kedip + status gagal per widget`.

---

### Task 4: Data source Expert wizard + baca config lebih dulu

**Files:**
- Modify: `src/app/pages/iot/widget-builder/widget-wizard/widget-wizard.component.ts:~3405-3440` (body create/update)
- Modify: `dashboard-view.component.ts:~244-248`
- Modify (SDK manual bila tipe menolak): `src/sdk/core/models/update-widget-dto.ts` (sudah ada `dataSource?`), `create-widget-dto.ts` (sudah ada).

- [ ] **Step 1:** Wizard: tambah `dataSource: <dataSource query pertama, atau form.dataSource>` ke body create & update.
- [ ] **Step 2:** View: `dataSource: w.config?.dataSource ?? w.dataSource ?? 'postgresql'` (config menang — memperbaiki widget Expert lama yang kolomnya salah `postgresql`).
- [ ] **Step 3:** Verify: `tsc` bersih; buat widget Expert ClickHouse (`SELECT 1 AS value FROM system.one`) di dashboard uji → tampil tanpa error; `SELECT data_source FROM custom_widgets WHERE id_widget=…` → `clickhouse`.
- [ ] **Step 4:** Commit `fix(widget-builder): widget Expert ClickHouse tidak lagi jalan di PostgreSQL`.

---

### Task 5: Util geometri layar target (logika murni)

**Files:**
- Create: `src/app/pages/iot/widget-builder/utils/screen-fit.ts`
- Test: `src/app/pages/iot/widget-builder/utils/screen-fit.test.ts`

**Interfaces:**
- Produces:
  - `type ScreenPreset = 'auto' | 'tv-16-9' | 'custom'`
  - `interface ScreenConfig { preset: ScreenPreset; width: number; height: number; rows: number }`
  - `readScreenConfig(layoutConfig: unknown): ScreenConfig` — dari `layoutConfig.screen`; default `{preset:'auto', width:1920, height:1080, rows:12}`; `tv-16-9` selalu 1920×1080; `custom` butuh width,height > 0 (else jatuh ke auto); `rows` dibatasi 4..48.
  - `fitBox(availW: number, availH: number, ratioW: number, ratioH: number): { width: number; height: number }` — contain-fit, dibulatkan ke bawah (`Math.floor`).
  - `rowHeight(boxH: number, rows: number, margin: number): number` — `(boxH - margin*(rows+1)) / rows`, floor, minimal 8.
  - `fontScale(boxW: number, designW: number): number` — `boxW/designW`, dibulatkan 3 desimal.
  - `overflowIds(items: { id: string; y: number; rows: number }[], rows: number): string[]`.

- [ ] **Step 1: Write the failing tests**
```ts
import { test } from 'node:test'; import assert from 'node:assert/strict';
import { readScreenConfig, fitBox, rowHeight, fontScale, overflowIds } from './screen-fit';
test('default auto', () => assert.deepEqual(readScreenConfig(undefined), { preset: 'auto', width: 1920, height: 1080, rows: 12 }));
test('tv preset forced 1920x1080', () => assert.deepEqual(readScreenConfig({ screen: { preset: 'tv-16-9', width: 5, height: 5, rows: 10 } }), { preset: 'tv-16-9', width: 1920, height: 1080, rows: 10 }));
test('bad custom falls back to auto', () => assert.equal(readScreenConfig({ screen: { preset: 'custom', width: 0, height: 900 } }).preset, 'auto'));
test('rows clamped', () => assert.equal(readScreenConfig({ screen: { preset: 'tv-16-9', rows: 200 } }).rows, 48));
test('fit wide area letterboxes width', () => assert.deepEqual(fitBox(2000, 1080, 16, 9), { width: 1920, height: 1080 }));
test('fit laptop', () => assert.deepEqual(fitBox(1366, 700, 16, 9), { width: 1244, height: 700 }));
test('4K css viewport', () => assert.deepEqual(fitBox(3840, 2160, 16, 9), { width: 3840, height: 2160 }));
test('row height', () => assert.equal(rowHeight(1080, 12, 4), 85));
test('font scale 4K', () => assert.equal(fontScale(3840, 1920), 2));
test('overflow', () => assert.deepEqual(overflowIds([{ id: 'a', y: 0, rows: 4 }, { id: 'b', y: 10, rows: 4 }], 12), ['b']));
```
- [ ] **Step 2:** Run `npx --yes tsx@4.19.2 --test src/app/pages/iot/widget-builder/utils/screen-fit.test.ts` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Re-run → PASS.
- [ ] **Step 5:** Commit `feat(widget-builder): util geometri layar target TV`.

---

### Task 6: LayoutStateService + Layar Penuh universal

**Files:**
- Create: `src/app/service/layout-state.service.ts`
- Modify: `src/app/pages/iot/projects/project-workspace/project-workspace.component.{ts,html,scss}` (aside :12, mobile toggle :4, toolbar :240)
- Modify: `dashboard-view.component.{ts,html,css}` (ganti `toggleKioskMode` 374-395, `ngOnDestroy` 146-158, toolbar html)

**Interfaces:**
- Produces: `@Injectable({providedIn:'root'}) class LayoutStateService { readonly immersive$: BehaviorSubject<boolean>; get immersive(): boolean; enter(): void; exit(): void; }`
  - `enter()`: simpan nilai `appSettings.appHeaderNone/appSidebarNone`, set keduanya `true`, `immersive$.next(true)`, `document.documentElement.requestFullscreen?.()` (abaikan penolakan — tetap immersive tanpa Fullscreen API).
  - `exit()`: kembalikan nilai appSettings tersimpan, `immersive$.next(false)`, `document.exitFullscreen()` bila `document.fullscreenElement`.
  - Listener `fullscreenchange`: bila browser keluar fullscreen saat immersive → `exit()` (Review Focus 1).
  - Listener `Router` `NavigationStart` ke URL lain → `exit()` (Review Focus 2).

- [ ] **Step 1:** Implement service (inject `AppSettings`, `Router`, `NgZone`).
- [ ] **Step 2:** Workspace: subscribe `immersive$` → kelas `.immersive` di root `.project-workspace` yang menyembunyikan `.project-sidebar`, `.mobile-sidebar-toggle`, `.mobile-overlay`, `.workspace-toolbar` dan menghapus padding/margin `.workspace-content` (SCSS).
- [ ] **Step 3:** Dashboard-view: tombol layar penuh memanggil `layoutState.enter()/exit()`; hapus `kioskMode` & manipulasi appSettings lokal (termasuk di `ngOnDestroy` → panggil `layoutState.exit()` bila immersive). Saat immersive: sembunyikan `.dashboard-toolbar`, tampilkan header tipis (nama dashboard · jam `HH:mm` · `Diperbarui …` dari Task 3) dan tombol keluar yang muncul saat mouse bergerak, hilang setelah 3 dtk diam. Setelah enter/exit panggil `gridsterOptions.api?.optionsChanged()` + `window.dispatchEvent(new Event('resize'))` (pola lama).
- [ ] **Step 4:** Container: `@Input() readOnly = false` → sembunyikan Duplicate/Edit/Delete (Refresh & Fullscreen widget tetap). View mengoper `readOnly = embeddedMode || immersive`; di `embeddedMode` item "Add Widget/Edit Layout" pada menu Dashboard diganti satu item `Buka di Widget Builder` → `/iot/widget-builder/<id>`.
- [ ] **Step 5:** Verify (`tsc` bersih) di Monitor Tebo: Layar Penuh → tidak ada header, sidebar app, sidebar workspace, breadcrumb; Esc → semua kembali; masuk layar penuh lalu klik link browser back → menu kembali. Ulangi di `/iot/widget-builder/635a8cef-…`.
- [ ] **Step 6:** Commit `feat(widget-builder): layar penuh universal tanpa sidebar workspace`.

---

### Task 7: Mode TV di dashboard-view (kotak 16:9, baris tetap, skala teks)

**Files:**
- Modify: `dashboard-view.component.{ts,html,css}` (`initGridsterOptions` 160-195, template gridster)
- Modify: `widget-container.component.css` + css renderer `components/widgets/{stat-card,table}/*.css`; option builder renderer `components/widgets/{line-chart,bar-chart,gauge,pie-chart}/*.ts`

**Interfaces:**
- Consumes: Task 5 `readScreenConfig`, `fitBox`, `rowHeight`, `fontScale`, `overflowIds`; Task 2 `dashboard.layoutConfig`.
- Produces: container `@Input() fontScale = 1`; renderer chart `@Input() fontScale = 1`.

- [ ] **Step 1:** View: `screen = readScreenConfig(dashboard.layoutConfig)`. Bila `preset !== 'auto'`: bungkus gridster dengan `<div class="tv-stage" [style.width.px] [style.height.px] [style.--wb-scale]>` hasil `fitBox(areaW, areaH, screen.width, screen.height)`, di tengah area (letterbox, latar `var(--bs-body-bg)`); area = elemen host (immersive: viewport dikurangi header tipis). `ResizeObserver` pada area → hitung ulang. Gridster: `gridType: GridType.VerticalFixed`, `fixedRowHeight: rowHeight(box.height, screen.rows, 4)`, `minRows = maxRows = screen.rows` (view mode), lalu `api.optionsChanged()`. Host `overflow: hidden` saat mode TV.
- [ ] **Step 2:** Edit mode TV: `maxRows` dilonggarkan ke `screen.rows + 12` supaya widget bisa ditarik; garis batas di baris ke-`rows` (border putus-putus `var(--bs-warning)`), widget dari `overflowIds` diberi outline `var(--bs-danger)`, dan banner `N widget berada di luar layar TV` bila >0.
- [ ] **Step 3:** Skala teks: container set `font-size: calc(13px * var(--wb-scale, 1))` untuk judul panel; stat-card & table pakai `calc(<px> * var(--wb-scale, 1))` di css-nya; renderer ECharts mengalikan semua `fontSize`/`itemSize`/`lineStyle.width` yang di-hardcode dengan `fontScale` (renderer yang sudah menghitung ukuran dari `containerWidth/Height` dibiarkan). View mengoper `fontScale = fontScale(box.width, screen.width)` (mode auto → 1).
- [ ] **Step 4:** Verify (`tsc` bersih). Buat sementara `layout_config.screen = {"preset":"tv-16-9","rows":12}` pada dashboard uji (salinan, bukan Tebo asli). Dengan playwright/Chrome: viewport 1920×1080 dan 3840×2160 (layar penuh) → tidak ada scroll, proporsi & ukuran teks relatif sama, grafik tajam di 3840; viewport 1366×768 → letterbox, tidak terpotong; mode edit → widget di luar baris 12 bertanda.
- [ ] **Step 5:** Commit `feat(widget-builder): mode layar TV 16:9 muat satu layar`.

---

### Task 8: Pengaturan Dashboard (layar target, baris, rentang & refresh default)

**Files:**
- Modify: `components/dashboard-modal/dashboard-modal.component.{ts,html}`
- Modify: `dashboard-list/dashboard-list.component.{ts,html}` (`editDashboard` 111-130, kartu dashboard)
- Modify: `dashboard-view.component.{ts,html}` (item menu `Pengaturan Dashboard`)

**Interfaces:**
- Consumes: Task 5 `readScreenConfig`, `ScreenConfig`; Task 1 `normalizeRefresh`.
- Produces: modal result `{ name, description, idProject, timeRange: string, refreshInterval: number, screen: ScreenConfig }`; helper di list & view `saveDashboardSettings(dashboard, result)` yang mengirim `PUT` dengan `layoutConfig: { ...dashboard.layoutConfig, screen: result.screen }`, `timeRange`, `refreshInterval`.

- [ ] **Step 1:** Modal: field baru — `Layar target` (select: Otomatis (scroll) / TV 16:9 (1080p & 4K) / Ukuran khusus), `Lebar`/`Tinggi` (hanya untuk khusus), `Jumlah baris layar` (default 12, hanya bila bukan Otomatis), `Rentang waktu default` (`TIME_RANGE_PRESETS`), `Auto-refresh default` (`REFRESH_INTERVALS`; default 60 untuk preset TV). Label Indonesia.
- [ ] **Step 2:** List & view memakai satu fungsi simpan yang menggabungkan `layoutConfig` (variables tetap utuh). Kartu dashboard menampilkan badge `TV 16:9` / `Layar W×H` bila bukan auto. View me-reload dashboard setelah simpan.
- [ ] **Step 3:** Verify (`tsc` bersih): ubah dashboard uji ke TV 16:9 dari Monitor (menu Dashboard → Pengaturan) → layout langsung berubah; cek DB `SELECT layout_config, time_range, refresh_interval FROM custom_dashboards WHERE id_dashboard=…` → `variables` lama masih ada, `screen` tersimpan.
- [ ] **Step 4:** Commit `feat(widget-builder): pengaturan layar target & default refresh dashboard`.

---

### Task 9: Penutup — QA visual, skill & backlog

**Files:**
- Modify: `iot-angular/.claude/skills/widget-builder/SKILL.md` (bagian mode TV, LayoutStateService, util + cara tes `tsx`), `references/backlog.md` (hapus: auto-refresh stub, CH Expert di PG, time_range diabaikan, menu edit di embed).
- Modify: `iot-angular/docs/design/2026-11-13-monitor-tv-design.md` §6.1 — sesi habis: perilaku yang ada (interceptor → `logout()` → `/auth/login`) dipakai; tidak ada overlay khusus (immersive otomatis lepas, Task 6).

- [ ] **Step 1:** Jalankan semua tes util: `npx --yes tsx@4.19.2 --test src/app/pages/iot/widget-builder/utils/*.test.ts` → PASS; `npx tsc -p tsconfig.app.json --noEmit` → bersih.
- [ ] **Step 2:** Dispatch `scada-visual-auditor` (mode QA) untuk dashboard uji di 1920×1080, 3840×2160, 1366×768, terang & gelap, Monitor embedded + Widget Builder; dispatch `senior-dev-auditor` untuk diff. Perbaiki temuan P0/P1.
- [ ] **Step 3:** Update skill & backlog & design doc.
- [ ] **Step 4:** Commit `docs(widget-builder): skill & backlog setelah mode TV`.

---

**Sesudah plan ini (plan terpisah):** Fase 2 (widget Peta, SCADA embed, stat-grid) dan Fase 3 (skill `monitor-dashboard` + agen `dashboard-author`, lalu dashboard "Monitor TV — Cabang Tebo" yang dirakit bersama user).
