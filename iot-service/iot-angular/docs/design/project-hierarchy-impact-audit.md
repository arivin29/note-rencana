# Audit Dampak — Project Flat → Project Tree (`type` + `parent_id`)

Tanggal: **2026-07-07** · Status: **AUDIT** (keputusan arsitektur sudah final, dokumen ini
memetakan dampak & solusi, bukan merancang ulang) · Penulis: feature-designer

---

## 1. Ringkasan keputusan & tujuan

Model organisasi saat ini flat: `Owner (PDAM) → Project → Node → Sensor` — sebagian PDAM
memakai project sebagai DMA, sebagian sebagai Cabang, sehingga NRW tidak bisa di-roll-up
atau dibandingkan antar-PDAM. Keputusan (final): tabel `projects` **dipertahankan** (PK
`id_project` tidak berubah, tidak ada tabel baru) dan menjadi **node pohon** dengan dua kolom
baru — `type` (`branch`/`section`/`dma`/`site`) dan `parent_id` (self-reference). Konsekuensi
yang harus didukung: (1) SCADA diagram nempel di level manapun + drill-down + zone
auto-generate + status roll-up; (2) dashboard widget ber-`scopeType`+`scopeId` dengan agregasi
roll-up naik pohon (NRW cabang = Σ DMA); (3) NRW dihitung di level `dma`. Audit ini menyapu
3 repo (iot-backend-go, iot-angular, iot-scada) + 1 repo satelit (iot-ai-nrw) dan setiap
klaim merujuk file nyata.

---

## 2. Model data: sebelum vs sesudah

### 2.1 Sebelum (ground truth)

Model GORM: `iot-backend-go/app/models/project/project.go` (`TableName "projects"`):

| Kolom | Tipe | Catatan |
|---|---|---|
| `id_project` | uuid PK | `gen_random_uuid()` |
| `id_owner` | uuid NOT NULL → `owners` | akar multi-tenant |
| `name` | text | |
| `area_type` | text NULL | "kategori" flat sekarang (`plant/pipeline/farm/industrial/other` — lihat form `projects-add.ts`) |
| `geofence` | jsonb | |
| `status` | text default `'active'` | |
| `created_at`/`updated_at` | via `app/models/base.go` | tidak ada soft-delete |

FK masuk ke `projects` (dari `.claude/DB-SCHEMA.md` + model Go): `nodes.id_project` (NOT NULL),
`node_locations`, `node_assignments`, `node_profiles` (NULL), `sensor_logs.id_project`
(denormalized), `scada_diagrams.id_project` (NULL), `user_dashboards.id_project` (NULL),
`map_layer.id_project` (NULL), `spatial_upload_file.id_project` (NULL),
`custom_dashboards.id_project` (NULL). Skala live: 18 owners, **15 projects**, 43 nodes.

### 2.2 Sesudah (kolom baru saja — tidak ada tabel baru)

```sql
ALTER TABLE projects
  ADD COLUMN type      text NOT NULL DEFAULT 'dma'
      CHECK (type IN ('branch','section','dma','site')),
  ADD COLUMN parent_id uuid NULL
      REFERENCES projects(id_project) ON DELETE RESTRICT;

CREATE INDEX idx_projects_parent_id ON projects(parent_id);
CREATE INDEX idx_projects_owner_parent ON projects(id_owner, parent_id);
-- opsional guard: parent tidak boleh diri sendiri
ALTER TABLE projects ADD CONSTRAINT chk_projects_no_self_parent
  CHECK (parent_id IS NULL OR parent_id <> id_project);
```

Contoh nilai (PDAM Kukar):

| id_project | name | type | parent_id |
|---|---|---|---|
| B1 | Cabang Tenggarong | `branch` | NULL |
| S1 | Bagian Produksi | `section` | B1 |
| S2 | Bagian Distribusi | `section` | B1 |
| P1 | IPA Tenggarong | `site` | S1 |
| D1 | DMA Melayu | `dma` | S2 |

Aturan semantik (ditegakkan di service layer, bukan DB): **node/sensor hanya boleh menempel
di `dma`/`site` (leaf operasional)**; `branch`/`section` = simpul agregasi. Deteksi siklus
juga di service (walk ancestors saat set `parentId`) karena CHECK tidak bisa.

### 2.3 Mekanisme migrasi yang tersedia

- `iot-backend-go/database/migrations/` = **file `.sql` mentah** berpola
  `YYYYMMDD_NNN_deskripsi.sql` (contoh existing `20260625_001_installation_profiles.sql`),
  dijalankan **manual via psql** (tidak ada runner; `bootstrap/migrations.go` mengembalikan
  slice kosong). Kolom baru = file `20260707_001_add_project_tree.sql`.
- `.claude/DB-SCHEMA.md` (iot-angular) wajib diupdate setelah migrasi (source-of-truth doc).
- `sensor_logs.id_project` denormalized tetap valid karena `id_project` dipertahankan.

---

## 3. Matriks Dampak Modul

Jenis: `schema` / `query-scope` (filter satu id → subtree) / `API` (DTO/param baru) /
`UI` / `agregasi` / `migrasi` / `none`.

| # | Modul | Repo | File kunci | Jenis dampak | Tingkat | Solusi ringkas |
|---|---|---|---|---|---|---|
| 1 | project | backend-go | `app/models/project/project.go`, `app/dto/project/project_dto.go`, `app/repositories/project/project_repository.go`, `app/services/project/project_service.go`, `app/http/controllers/project/project_controller.go`, `routes/api.go:124-131` | schema+API+agregasi | **Tinggi** | Tambah `type`+`parentId` di model/DTO/filter; metrik List/Detailed/Statistics jadi rekursif subtree; endpoint tree baru |
| 2 | dashboard (agregat platform) | backend-go | `app/repositories/dashboard/dashboard_repository.go` (`appendProjectScope`, ±10 query) | query-scope+agregasi | **Tinggi** | Helper `projectSubtreeIDs()` (recursive CTE) → `n.id_project IN (subtree)` |
| 3 | scada | backend-go | `app/services/scada/scada_service.go` (list :105-120, binding-options :563-590), `app/services/scada/scada_access.go`, `app/dto/scada/scada_dto.go` | query-scope+API | **Tinggi** | `projectId` filter opsional include-subtree; diagram boleh nempel di level apapun (sudah nullable); endpoint status roll-up baru |
| 4 | widgetbuilder (custom dashboards) | backend-go | `app/http/controllers/widgetbuilder/widget_builder_controller.go` (`custom_dashboards.id_project` :24, filter :89/99, `GetDashboardsByProject`, routes :436) | API+agregasi | **Tinggi** | Tambah `scopeType`+`scopeId` (jsonb `config_json` widget + kolom dashboard); resolusi scope → subtree channel ids sebelum ClickHouse |
| 5 | node (scoping) | backend-go | `app/repositories/node/node_repository.go:34-37,105,112`, `app/dto/node/node_dto.go:83` | query-scope+validasi | **Tinggi** | Filter `id_project` → opsi subtree; validasi create/move: node hanya ke `dma`/`site` |
| 6 | sensor/sensorchannel/sensorlog (scoping) | backend-go | `app/repositories/sensor/sensor_repository.go:112`, `sensorchannel/sensor_channel_repository.go:40,99`, `sensorlog/sensor_log_repository.go:124-125`, `app/services/sensorlog/sensor_log_service.go:560-562` | query-scope | **Tinggi** | Subquery `nodes WHERE id_project = ?` → `IN (subtree)` |
| 7 | report | backend-go | `app/http/controllers/report/report_controller.go:47-52,75-116,301` | query-scope | **Tinggi** | Resolusi `projectId`→node/channel ids diperluas ke subtree; template simpan `projectId`+`type` |
| 8 | NRW / analytics | iot-ai-nrw | `src/` (belum ada referensi project sama sekali — grep kosong), `docs/` 01–09 | agregasi (desain) | **Tinggi** | Job NRW/MNF baru di-scope per project `type='dma'`; mapping dma→inflow/outflow channels; roll-up cabang = Σ dma via tree backend |
| 9 | SDK Angular | iot-angular | `src/sdk/core/models/project-response-dto.ts`, `create/update-project-dto.ts`, `fn/projects/projects-controller-find-all.ts`, `services/projects.service.ts` | API | **Tinggi** | Regen broken (X-API-Key) → edit manual DTO+params `type`/`parentId`/`rootOnly` mengikuti gotcha proyek |
| 10 | Angular projects feature | iot-angular | `src/app/pages/iot/projects/` (`projects-list.ts`, `projects-add.ts`, `project-workspace.component.ts`, `projects-routing.module.ts`) | UI+API | **Tinggi** | List jadi tree/indent per type; form + dropdown parent (cascade type); workspace sidebar sisipkan subtree di atas nodes |
| 11 | Angular dashboard & dashboard-kedua | iot-angular | `iot-dashboard.ts:216-450`, `dashboard-kedua/widgets/dk-owner-project-filters.component.ts:95,118`, semua widget `@Input() projectId` | UI+agregasi | **Tinggi** | Filter project jadi tree-select; pilih `branch` = subtree (backend expand); sentinel `'all'` tetap |
| 12 | Angular widget-builder | iot-angular | `widget-builder/models/widget.models.ts:9,79`, `dashboard-modal.component.ts`, `dashboard-list.component.ts` | API+UI | **Tinggi** | `Dashboard.projectId` + `WidgetConfig` dapat `scope:{type,id}` terstruktur (bukan hanya SQL var) |
| 13 | SCADA scoping & list | iot-scada | `src/pages/DiagramListPage.tsx:60-131,299-312`, `src/hooks/useScadaDiagram.ts:17-31,141-210`, `src/types/scada.ts:333-354` | API+UI | **Tinggi** | List difilter per node tree; dropdown create jadi tree; `projectId` flat tetap valid (BC) |
| 14 | SCADA drill-down & embed | iot-scada + iot-angular | `iot-scada/src/App.tsx:56-112` (`:projectId` embed TIDAK pernah dibaca — `DiagramPage.tsx:37`), `iot-angular/src/app/services/scada.service.ts` (`getEmbedUrl`) | UI+routing | **Tinggi** | Konsumsi `:projectId`; navigasi antar diagram ancestor/descendant; URL embed tidak berubah (BC) |
| 15 | SCADA zone & roll-up | iot-scada | `src/nodes/ZoneNode.tsx:26-194` (membership geometris murni, "MVP: no true parenting"), `src/stores/useRuntimeStore.ts:31-73`, `src/hooks/useRuntimePolling.ts` | UI+agregasi | **Tinggi** | ZoneNode dapat binding `projectRef` (id project subtree); auto-generate zone dari children; roll-up status via endpoint backend baru, bukan geometri |
| 16 | userdashboard | backend-go | `app/models/userdashboard/user_dashboard.go:8`, `app/repositories/userdashboard/user_dashboard_repository.go:31` | query-scope | Sedang | Filter `id_project` opsi subtree; kolom sudah nullable (BC aman) |
| 17 | webgis | backend-go + iot-angular | `app/services/webgis/webgis_service.go:47-115,315-326`, `app/repositories/webgis/layer_repository.go:43-136`; Angular `webgis-map.ts:92` (**hardcoded default projectId `1414bdba-…`**), `add-layer-drawer.ts:524` | query-scope+UI | Sedang | Layer per project tetap (nempel di level manapun); peta level `branch` = gabung geojson subtree; buang hardcoded default |
| 18 | alertrule / alertevent | backend-go | `app/services/alertrule/alert_rule_service.go:80,282,294-296` (join `projects` untuk projectName+owner scope), `app/repositories/alertevent/alert_event_repository.go:102` | query-scope | Sedang | Scoping via owner tidak berubah; bila nanti filter per-project → subtree |
| 19 | Angular telemetry & telemetry-channels | iot-angular | `telemetry-list.ts:140,252,614`, `telemetry-channels-list.ts:127` | UI | Sedang | Dropdown project jadi tree-select; query `idProject` tetap (BC), tambah opsi subtree |
| 20 | Angular nodes | iot-angular | `nodes-list.ts:19,91,129`, `nodes-detail.ts:280` | UI+validasi | Sedang | Dropdown project di form node dibatasi `type IN (dma,site)` |
| 21 | Angular report | iot-angular | `report-page.ts:242` + html select `projectId` | UI | Sedang | Tree-select + kirim flag subtree |
| 22 | Mobile (Helios) | iot-angular | `src/app/mobile/mobile-routing.module.ts` (`projects/:id`), `mobile-projects-list.component.ts`, `tabs/project-scada.component.ts`, `src/app/services/project-context.service.ts` (`ActiveProject {idProject,name}`, localStorage) | UI | Sedang | List project ber-grup per cabang; `ActiveProject` + `type`; embed SCADA per level; fallback flat tetap jalan |
| 23 | nodeassignment / nodelocation / nodeprofile | backend-go | `node_assignment_repository.go:32-33`, `node_location_repository.go:32-34`, `node_profile_repository.go:34-35` | query-scope | Sedang | Filter `id_project` → opsi subtree bila dibutuhkan; default tak berubah |
| 24 | unpaired-devices (pairing) | iot-angular | `pairing-workspace.ts:29` (**hardcoded projectId `bf750919-…`**), `step-node-config.component.*` | UI | Sedang | Dropdown project pairing dibatasi `dma`/`site`; buang hardcode |
| 25 | iotlog | backend-go | `app/services/iotlog/iot_log_service.go:123,166-170` | query-scope | Sedang | `nodes WHERE id_project = ?` → subtree |
| 26 | SCADA sensor picker | iot-scada | `src/components/NodeConfigDrawer.tsx:475-503` (kirim `ownerId` saja; param `projectId` SUDAH ada di `src/sdk/models/scadaBindingOptionsControllerFindAllParams.ts` tapi tak dipakai) | UI (aditif) | Sedang | Kirim `projectId` diagram → picker terfilter subtree |
| 27 | owner (`GET /owners/{id}/projects`) | backend-go | `app/http/controllers/owner/owner_controller.go` route `routes/api.go:98`; dipakai raw-fetch oleh `iot-scada/src/pages/DiagramListPage.tsx:88-101` | API | Sedang | Response tambah `type`/`parentId` (aditif, BC) |
| 28 | search | iot-angular | `src/app/services/search.service.ts` (`ProjectSearchResult`) | UI | Rendah | Tampilkan badge type + breadcrumb path (aditif) |
| 29 | sensorcontext | backend-go | `app/repositories/sensorcontext/sensor_context_repository.go:151,171` (join projects untuk nama saja) | none/kosmetik | Rendah | Tidak berubah; opsional tampilkan path |
| 30 | ClickHouse | backend-go + gateway | `app/services/clickhouse/clickhouse_service.go` (generik `ExecuteQuery`); report/widget-builder resolusi channel ids di Postgres dulu (`report_controller.go:301`, `widget_builder_controller.go:387`) | none | Rendah | Skema CH tidak tersentuh — scoping selalu diterjemahkan ke channel/node id di Postgres |
| 31 | Angular alerts / ml-dashboard / iot-config / owners pages | iot-angular | grep `idProject|projectId` = kosong di dir tsb | none | Rendah | Tidak ada perubahan |
| 32 | iot-gtw (gateway) | iot-gtw | *(tidak diaudit mendalam — ingest per channel/deviceId, bukan per project)* | none (perlu cek) | Rendah | Verifikasi apakah gateway menulis `sensor_logs.id_project`; kalau ya, nilainya tetap valid (id dipertahankan) |

**Rekap tingkat: Tinggi = 15 · Sedang = 12 · Rendah = 5.**

---

## 4. Detail modul dampak-Tinggi

### 4.1 Backend — modul `project`

**Yang berubah & kenapa**
- `app/models/project/project.go` — tambah `Type string \`gorm:"column:type" json:"type"\`` dan
  `ParentID *string \`gorm:"column:parent_id" json:"parentId"\``.
- `app/dto/project/project_dto.go` — `CreateProjectDTO`/`UpdateProjectDTO` + `type`,`parentId`;
  `ProjectFilter` + `type`, `parentId`, `rootOnly` (bool), `includeSubtree` (bool).
- `app/repositories/project/project_repository.go` — `FindAll` dapat filter baru; tambah
  `FindSubtreeIDs(rootID)` (recursive CTE, lihat §6) dan `FindChildren(parentID)`.
- `app/services/project/project_service.go` — titik paling sensitif: metrik `List` saat ini
  raw-count `WHERE id_project = ?` (nodes :77, online :78, sensors :79, primaryLocation :92,
  lastSync :98) — **semua mengasumsikan project = leaf pemegang nodes**. Untuk `branch`/
  `section` count = 0 padahal harusnya Σ subtree → ganti `id_project = ?` menjadi
  `id_project IN (subtree)`. `GetByIDDetailed` (:147-169) sama. `GetStatistics` (:292)
  `GROUP BY area_type` → tambah breakdown `GROUP BY type` (JANGAN hapus `projectsByAreaType`
  dari response — kontrak).
- Validasi service baru: (a) `parentId` harus project owner yang sama (`id_owner` match);
  (b) anti-siklus (walk ancestors); (c) aturan level opsional (dma di bawah section, dst —
  rekomendasi: **warning saja, jangan hard-block**, karena PDAM kecil mungkin 2-level);
  (d) `Delete` (:240) tolak bila punya children (FK `ON DELETE RESTRICT` sudah menjaga).
- Endpoint baru (aditif): `GET /api/projects/tree?ownerId=` → nested `{data:[...]}` dan/atau
  `GET /api/projects/{id}/children`. Route di `routes/api.go` blok :124-131.

**Scoping tenant** — tidak berubah: `List` :34 paksa `filter.OwnerID = sc.OwnerID` untuk
tenant; `GetByID` :123 guard `sc.OwnerID != project.IDOwner`. Tree tidak lintas-owner by
konstruksi (validasi (a)).

**Backward compatibility** — `GET /api/projects` tanpa param baru mengembalikan SEMUA node
pohon flat seperti sekarang (default `DEFAULT 'dma'` mengisi project lama) → klien lama tetap
jalan. `type`/`parentId` di response DTO = field tambahan camelCase, envelope tidak berubah.

**Risiko** — dropdown lama (7+ komponen, lihat 4.6) akan menampilkan branch/section juga;
mitigasi: konsumen yang butuh leaf memakai `?type=dma,site` (aditif, opsional).

### 4.2 Backend — `dashboard` (agregat platform)

`app/repositories/dashboard/dashboard_repository.go` adalah pemakai project terberat:
helper `appendProjectScope(..., "p.id_owner", "n.id_project")` dipanggil ±10+ query
(:55, :67, :80, :292, :380, :389, :403) + filter `filter.ProjectID` (:40, :370, :425, :509).
Semua equality `n.id_project = ?`.

**Solusi** — satu titik ubah: `appendProjectScope` menerima daftar id hasil
`projectRepo.FindSubtreeIDs(projectID)` → `n.id_project IN (?)`. Karena helper terpusat,
blast radius kecil; yang harus diaudit manual hanya query yang mem-filter `ProjectID` langsung
tanpa helper (:370, :425, :509). Scoping tenant (`p.id_owner`) tidak berubah.
**BC**: `projectId` = leaf (dma) menghasilkan subtree berisi dirinya sendiri → hasil identik
dengan sekarang. **Risiko**: kelolosan satu query → angka dashboard "hilang" saat user memilih
cabang; tambahkan test naik-pohon.

### 4.3 Backend — `scada`

- `scada_diagrams.id_project` **sudah nullable** (`app/models/scada/scada_diagram.go:10`) —
  diagram bisa langsung nempel di project level manapun **tanpa perubahan skema**. Ini poin
  BC terbesar SCADA.
- List diagram: `scada_service.go` :105-120 filter opsional `AND d.id_project = ?` — tambah
  mode `includeSubtree=true` (diagram cabang + semua diagram DMA di bawahnya, untuk menu
  drill-down).
- Binding options :563-590 (`INNER JOIN projects ... AND project.id_project = ?`) — sama,
  subtree agar sensor picker diagram cabang bisa melihat channel DMA di bawahnya.
- `scada_access.go` `assertProjectAccess` (:36) — tidak berubah (cek `id_owner`); tree tidak
  lintas owner.
- **Baru**: endpoint status roll-up per project untuk zone auto-generate, mis.
  `GET /api/scada/projects/{projectId}/status-rollup` → per-child:
  `{ idProject, name, type, worstStatus, alertCount, bindingSummary }` (single object,
  langsung — bukan list envelope). Scoping: admin bebas, tenant `id_owner` match.
  Implementasi di `scada_service.go` memakai `FindSubtreeIDs` + agregasi
  `scada_node_bindings`→`sensor_channels`→nodes status.

**Risiko** — DTO scada (`app/dto/scada/scada_dto.go` `ProjectID` di 8 tempat) tetap scalar;
jangan mengubah bentuknya, cukup tambah field opsional.

### 4.4 Backend — `widgetbuilder` + `userdashboard` (widget scope)

- `custom_dashboards.id_project` (`widget_builder_controller.go:24`, filter :89/:99,
  `GetDashboardsByProject` route `routes/api.go:436`) — hari ini scope = 1 project.
- Keputusan butuh `scopeType`+`scopeId` per **widget**. Solusi termurah & BC:
  simpan terstruktur di `custom_widgets.config_json` (jsonb, sudah ada):
  `"scope": { "type": "project"|"subtree", "id": "<id_project>" }` — tanpa migrasi kolom.
  Di level dashboard, `id_project` tetap; tambah kolom opsional bila perlu nanti.
- Eksekusi query widget (`widget_builder_controller.go:387` `ExecuteQuery` ClickHouse):
  resolusi scope terjadi DI POSTGRES — `scopeId` di-expand ke subtree → daftar
  `id_sensor_channel`/`id_node` → disubstitusi ke SQL var (pola existing
  `WidgetConfig.variables`, terdokumentasi di Angular `widget.models.ts:79`).
- `user_dashboards.id_project` nullable (`user_dashboard.go:8`) — BC penuh; filter repo :31
  dapat opsi subtree.

**BC**: widget lama tanpa `scope` di config_json diperlakukan `scope={type:'project',
id:<dashboard.id_project>}` — perilaku identik. **Risiko**: dua sistem dashboard paralel
(`user_dashboards`+`dashboard_widgets` vs `custom_dashboards`+`custom_widgets`) — keduanya
harus dapat perlakuan sama agar tidak drift.

### 4.5 Backend — scoping node/sensor/telemetry + report

- `node_repository.go` :36-37 filter `id_project = ?` dan :34 owner-scope
  `id_project IN (SELECT id_project FROM projects WHERE id_owner ...)` — owner-scope TIDAK
  berubah (semua node pohon tetap milik owner); filter project dapat opsi subtree.
  **Baru**: validasi di node service — create/move node hanya ke project `type IN (dma,site)`.
- `sensor_repository.go:112`, `sensor_channel_repository.go:40,99` — subquery via nodes;
  berubah hanya bila filter per-project subtree diminta.
- `sensor_log_repository.go:124-125` + `sensor_log_service.go:560-562` — filter
  `id_project` denormalized: nilai lama tetap valid (id dipertahankan). **Catatan**: bila
  sebuah node dipindah ke project lain, log lama menyimpan `id_project` lama — ini perilaku
  existing (bukan regresi tree), tapi jadi lebih terasa saat re-parenting massal; putuskan
  apakah perlu backfill (lihat §7).
- Report (`report_controller.go:47-52`): `projectId` di body hanya konteks; filter aktual
  `nodeIds`/`sensorChannelIds` diresolusi via `sensors JOIN nodes` (:75-116) → satu titik
  ubah: resolusi `projectId→nodes` memakai subtree. ClickHouse (:301) tidak tersentuh.

### 4.6 Frontend Angular — SDK + projects + dashboard + widget-builder

**SDK (`src/sdk/core/`)** — generated, dan regen ng-openapi-gen **sedang broken (X-API-Key)**
→ sesuai gotcha proyek, edit manual yang minimal:
- `models/project-response-dto.ts`, `project-detailed-response-dto.ts`,
  `project-summary-dto.ts` — tambah `type?: string; parentId?: string | null;`.
- `models/create-project-dto.ts` / `update-project-dto.ts` — sama.
- `fn/projects/projects-controller-find-all.ts` — param `type`, `parentId`, `rootOnly`.
- Method baru (tree/children/status-rollup) ditambah manual di `services/projects.service.ts`
  pola `$Response`. **Gotcha kedua**: nama query-param backend HARUS dicek satu-satu (kasus
  `idProject` vs `projectId` di nodes) — kunci nama param di dokumen ini: `type`, `parentId`,
  `rootOnly`, `includeSubtree`.
- Model non-SDK yang mirror DTO: `src/app/models/iot/report-project.ts` (interface `Project`)
  — tambah field yang sama.

**Projects feature (`src/app/pages/iot/projects/`)**
- `projects-list/projects-list.ts` — tabel flat → tampilan tree (indent per `type`, badge
  branch/section/dma/site; pakai skill `ui-list`, kolom baru, filter `type`).
- `projects-add/projects-add.ts` — form (:76-80 fields `idOwner,name,areaType,status,geofence`)
  + `type` select + `parentId` dropdown (di-cascade: pilih owner → load kandidat parent;
  kandidat parent difilter type yang lebih tinggi).
- `project-workspace/project-workspace.component.ts` — sidebar sekarang membangun
  project→nodes→sensors dengan project sebagai root tunggal (`selectedAssetId = projectId`,
  ±:319) — sisipkan level children (branch → sections → dma) di atas nodes; workspace untuk
  `branch` menampilkan agregat, untuk `dma` seperti sekarang. Routing `:projectId` TIDAK
  berubah (id apapun di pohon valid) — **BC penuh untuk deep-link lama**.
- `analytics-page` (SCADA tab): `scadaService.getDiagramsByProject(projectId)` +
  `getEmbedUrl(projectId, diagramId, mode)` — bekerja apa adanya untuk level manapun karena
  diagram-per-project tetap; tambah opsi "termasuk diagram sub-level".

**Dashboard & dashboard-kedua**
- `iot-dashboard.ts` (:216, :222, :430, :450) dan
  `dk-owner-project-filters.component.ts` (:95, :118) — dropdown project flat → tree-select
  (component shared baru, mis. `project-tree-select`, dipakai juga oleh telemetry/report/nodes).
  Memilih `branch` mengirim `projectId=branchId` dan backend meng-expand subtree — **widget
  `@Input() projectId` tidak perlu berubah sama sekali** (dampak besar dihindari).
- Sentinel `'all'` dipertahankan.

**Widget-builder**
- `models/widget.models.ts` — `WidgetConfig` + `scope?: { type: 'project'|'subtree';
  id: string }`; `Dashboard.projectId` tetap.
- `dashboard-modal.component.ts` — select project jadi tree-select.

**Mobile (Helios)** — Sedang tapi dicatat di sini karena satu rantai: `project-context.service.ts`
(`ActiveProject { idProject, name }` di localStorage `devetek.activeProject`) tambah `type`
agar chip konteks bisa menampilkan level; `mobile-projects-list` dikelompokkan per cabang;
`project-scada` embed tidak berubah.

**Hardcoded id yang harus dibersihkan**: `webgis-map.ts:92` dan `pairing-workspace.ts:29`.

### 4.7 SCADA React — drill-down, zone, roll-up

Temuan kunci audit: arsitektur SCADA **diagram-centric** — `projectId` cuma metadata scalar;
param embed `:projectId` **tidak pernah dibaca** (`DiagramPage.tsx:37` hanya `diagramId`);
sensor picker filter `ownerId` saja padahal param `projectId` sudah tersedia di SDK
(`scadaBindingOptionsControllerFindAllParams.ts`). Artinya: **hampir tidak ada yang pecah**
oleh perubahan tree (BC sangat baik), tapi fitur baru = pembangunan, bukan penyesuaian.

Yang dibangun:
1. **Konsumsi projectId** — `DiagramPage.tsx` baca `:projectId` dari `useParams`;
   `DiagramListPage.tsx` :60-85 panggil `scadaDiagramsControllerFindAll({projectId})`
   (param sudah ada di `services.gen.ts:475-488`).
2. **Dropdown create** — `DiagramListPage.tsx` `loadProjects()` :88-101 raw-fetch
   `/api/owners/{id}/projects` flat → render tree (response akan bawa `type`/`parentId`,
   aditif).
3. **Drill-down** — navigasi antar diagram: node/zone yang merepresentasikan sub-project
   punya `config.drillDown = { projectId, diagramId? }` (disimpan di jsonb node config,
   pola sama dengan trik `binding.transform` di `useScadaDiagram.ts:157-175` — tanpa
   perubahan skema backend). Klik → route `/embed/:projectId/diagrams/:diagramId/view`.
4. **Zone auto-generate + roll-up** — `ZoneNode.tsx` saat ini roll-up **geometris**
   (bounding-box, :44-58, `STATUS_RANK` :15-17). Tambah mode `projectRef`: zone terikat ke
   `idProject` child; status diambil dari endpoint roll-up backend (§4.3) via store polling
   baru (perluasan `useRuntimeStore.ts` — hati-hati zustand v5 tanpa memoization: selector
   harus primitif/stabil). Mode geometris lama tetap ada (BC).
5. `useScadaDiagram.ts` `normalizeMeta`/`save` (:17-31, :148-156) — `projectId` scalar tetap;
   tambah passthrough `projectType` bila backend mengirim (opsional).

**Risiko** — runtime roll-up lintas diagram/subtree belum ada sama sekali
(`ScadaRuntimeResponse.summary` per-diagram saja, `types/scada.ts:259-268`); polling 5 detik
x banyak zone bisa berat → endpoint roll-up harus satu panggilan per diagram (batch semua
zone), bukan per zone.

### 4.8 NRW / analytics (`iot-ai-nrw`)

Grep `project` di `iot-ai-nrw/src` = **kosong** — worker sepenuhnya per-channel (`ai_config`),
jadi TIDAK ada kode existing yang pecah. Dampaknya desain ke depan:
- Job NRW/MNF (roadmap `night_pressure` §5.11 dok tekanan) butuh definisi "DMA" = project
  `type='dma'` + penandaan channel inflow/outflow per DMA. Kandidat termurah: konvensi di
  `ai_config` (scope per channel, tag peran) ATAU kolom/penanda di `sensor_channels` — perlu
  keputusan (lihat §8).
- Roll-up NRW cabang **tidak dihitung di worker Python** — worker menghasilkan angka per-DMA
  (tulis ke tabel `ai_*`), backend Go yang meng-roll-up naik pohon saat serve API (dok 08,
  read-only GORM). Konsisten dengan arah "agregasi di backend service" (§6).

---

## 5. Rencana migrasi data

Konteks: 15 projects live; **tidak ada runner migration** — SQL dijalankan manual (psql ke
`host=109.105.194.174 ... dbname=iot`, kreds `iot-backend-go/.env`). Project Tenggarong sudah
punya diagram SCADA (`scada_diagrams.id_project` menunjuk ke sana).

**Langkah (urut, tiap langkah aman berdiri sendiri):**
1. **File** `database/migrations/20260707_001_add_project_tree.sql` berisi DDL §2.2 —
   `type` pakai `NOT NULL DEFAULT 'dma'` supaya SATU langkah tanpa fase nullable (tabel 15
   baris, ALTER instan; kalau mau ekstra hati-hati: `ADD COLUMN NULL` → backfill → `SET NOT
   NULL`, tapi di skala ini tidak perlu). `parent_id` nullable selamanya (root = NULL).
2. **Backfill `type` per project** — manual bersama user, karena semantik pemakaian tiap PDAM
   beda (itulah masalah bisnisnya). Query bantu: project yang punya banyak node tersebar luas
   secara geografis ≈ dipakai sebagai "cabang"; yang kecil ≈ DMA. Khusus **Tenggarong**:
   diagram SCADA-nya adalah skema IPA/instalasi → kandidat `type='site'`; alternatif
   dibiarkan `dma` dulu (tidak ada yang pecah — semua kode jalan apa adanya). JANGAN membuat
   node branch/section baru di fase ini.
3. **Verifikasi non-breaking**: jalankan smoke di endpoint existing (`GET /api/projects`,
   `/api/projects/{id}/detailed`, list scada, dashboard) — respons harus identik + field baru.
4. **Buat simpul struktur** (opsional per PDAM, setelah Fase 1 backend jalan): insert
   `branch`/`section` baru, lalu `UPDATE projects SET parent_id=... WHERE id_project=...`
   untuk menggantung DMA/site lama. **Tidak ada perubahan `id_project` → semua FK
   (nodes, scada_diagrams, sensor_logs, user_dashboards, map_layer, custom_dashboards) utuh.**
5. **Re-parenting node (kalau ada)** — bila sebuah "project cabang" lama ternyata berisi node
   yang mestinya milik DMA berbeda: buat project dma baru, pindahkan `nodes.id_project`.
   Konsekuensi existing: `sensor_logs.id_project` historis tetap nilai lama — putuskan
   backfill atau biarkan (lihat §8-Q3).
6. Update `.claude/DB-SCHEMA.md` + memory schema.

**Rollback**: `ALTER TABLE projects DROP COLUMN parent_id, DROP COLUMN type;` — aman selama
belum ada data/fitur yang bergantung (jadi jangan tunda keputusan rollback melewati Fase 1).

---

## 6. Agregasi / roll-up naik pohon

**Pendekatan: recursive CTE Postgres, dihitung di backend Go — BUKAN materialized.**

```sql
WITH RECURSIVE subtree AS (
  SELECT id_project FROM projects WHERE id_project = $1
  UNION ALL
  SELECT p.id_project FROM projects p JOIN subtree s ON p.parent_id = s.id_project
)
SELECT id_project FROM subtree;
```

- **Kenapa cukup**: skala live 15 projects (mungkin ratusan dalam 2–3 tahun; kedalaman pohon
  4). CTE di tabel ber-index `parent_id` = sub-milidetik. Materialized path/ltree/closure
  table = kompleksitas maintenance (trigger saat re-parent) tanpa keuntungan terukur di skala
  ini. Revisit bila > ~5.000 projects.
- **Di mana**: satu implementasi kanonik `FindSubtreeIDs(rootID) []string` di
  `app/repositories/project/project_repository.go`, dikonsumsi oleh:
  - `app/services/project/project_service.go` (metrik List/Detailed/Statistics),
  - `app/repositories/dashboard/dashboard_repository.go` (`appendProjectScope`),
  - `app/services/scada/scada_service.go` (list diagram subtree, binding options, status
    roll-up),
  - `app/http/controllers/report/report_controller.go` (resolusi projectId→nodes),
  - `app/http/controllers/widgetbuilder/widget_builder_controller.go` (resolusi scope widget),
  - repo node/sensorlog bila filter subtree diminta.
- **Pola dua langkah untuk ClickHouse tidak berubah**: subtree → node/channel ids di
  Postgres → baru query ClickHouse (pola existing report :75-116/:301 dan widget-builder :387).
- **NRW cabang = Σ DMA**: worker `iot-ai-nrw` menulis angka per-DMA ke tabel `ai_*`; endpoint
  Go read-only melakukan Σ subtree saat serve (konsisten dok 08). Tidak ada agregasi di
  frontend.
- **Caching**: belum perlu; kalau roll-up SCADA di-poll 5 detik oleh banyak klien, tambahkan
  cache in-memory TTL pendek di service (bukan tabel materialized).

---

## 7. Risiko & trade-off

1. **Kelolosan query scoping (risiko #1)** — filter `id_project = ?` tersebar di ≥12 file
   backend (§3 baris 1–7, 16–25). Satu yang terlewat = angka "hilang" saat user memilih
   cabang, atau lebih buruk: laporan NRW salah. Mitigasi: semua lewat `FindSubtreeIDs`
   kanonik + test integrasi "pilih branch harus ⊇ hasil pilih tiap dma".
2. **Salah level attach** — begitu dropdown menampilkan branch/section, user bisa menempelkan
   node/pairing ke simpul agregasi (`pairing-workspace.ts` malah hardcode projectId).
   Mitigasi: validasi service node-create/move (`type IN (dma,site)`) — DB tidak bisa
   menjaganya sendiri.
3. **SDK drift** — regen broken → semua perubahan DTO/param manual; ditambah gotcha nama
   query-param backend ≠ SDK (kasus `idProject` vs `projectId` di nodes). Mitigasi: daftar
   nama param dikunci di dokumen ini (§4.6) + smoke test per endpoint.
4. **Semantik `sensor_logs.id_project` historis** saat re-parenting/pemindahan node — data
   lama menunjuk project lama. Bukan regresi baru, tapi jadi nyata saat restrukturisasi.
5. **Dua sistem dashboard paralel** (`user_dashboards` vs `custom_dashboards`) — perubahan
   scope harus konsisten di keduanya atau salah satunya di-deprecate.
6. **Performa roll-up SCADA** — polling 5 dtk × N zone; wajib batch per diagram (§4.7).
7. **Zustand v5** — store roll-up baru harus pakai selector stabil (tanpa memoization
   bawaan); kesalahan di sini = render-loop (gotcha terdokumentasi skill `scada-view`).
8. **Copy gateway** — yang berjalan adalah copy server `/var/www/...`; kalau ternyata gateway
   menulis `sensor_logs.id_project`, perubahan re-parenting perlu diverifikasi di copy yang
   di-deploy, bukan copy lokal.

**Trade-off yang diterima (by design)**: tanpa tabel baru → `projects` mencampur simpul
agregasi & leaf operasional; disiplin `type` menjadi krusial dan sebagian aturan hanya bisa
ditegakkan di service layer.

---

## 8. Open questions (perlu keputusan user)

- **Q1 — Backfill `type` untuk 15 project live**: mapping final per project (khususnya
  Tenggarong: `site` (IPA) atau tetap `dma`?). Rekomendasi: default semuanya `dma`, koreksi
  kasus-per-kasus bareng user.
- **Q2 — Aturan hierarki ketat atau longgar?** Wajib branch→section→dma/site, atau boleh
  dma langsung di bawah owner (PDAM kecil tanpa cabang)? Rekomendasi: longgar (parent
  opsional), UI yang mengarahkan.
- **Q3 — Backfill `sensor_logs.id_project`** saat node dipindah antar project? Rekomendasi:
  tidak (biarkan historis), tapi perlu ack user karena memengaruhi laporan periode lampau.
- **Q4 — Penandaan inflow/outflow per DMA untuk NRW**: konvensi di `ai_config` (repo
  iot-ai-nrw) atau penanda di `sensor_channels` (backend)? Menentukan siapa pemilik metadata.
- **Q5 — `area_type` dipertahankan atau di-deprecate** setelah `type` ada? Rekomendasi:
  pertahankan (kontrak response `projectsByAreaType` di `GetStatistics`), deprecate pelan.
- **Q6 — Drill-down embed**: satu instance SCADA berpindah route internal, atau parent
  (Angular/mobile) yang mengganti iframe URL? Menentukan siapa yang memegang riwayat navigasi.

---

## 9. Checklist implementasi bertahap

### Fase 0 — Skema + migrasi (non-breaking, bisa deploy kapan saja)
- [ ] Tulis `iot-backend-go/database/migrations/20260707_001_add_project_tree.sql` (DDL §2.2)
- [ ] Jalankan manual via psql ke DB live; verifikasi `\d projects`
- [ ] Backfill `type` per project bersama user (Q1), termasuk keputusan Tenggarong
- [ ] Update `app/models/project/project.go` (field `Type`, `ParentID`)
- [ ] Update `iot-angular/.claude/DB-SCHEMA.md`
- [ ] Smoke: `GET /api/projects`, `/detailed`, scada list, dashboard — respons identik + field baru

### Fase 1 — Backend scoping + API
- [ ] `project_repository.go`: `FindSubtreeIDs` (recursive CTE) + `FindChildren` + filter `type`/`parentId`/`rootOnly`
- [ ] `project_dto.go`: `type`/`parentId` di Create/Update/Filter (+ validasi service: same-owner parent, anti-siklus, delete-with-children)
- [ ] `project_service.go`: metrik List/Detailed/Statistics jadi subtree-aware; breakdown `GROUP BY type`
- [ ] Endpoint `GET /api/projects/tree` (+ `routes/api.go`)
- [ ] `dashboard_repository.go`: `appendProjectScope` → subtree; audit query ber-`ProjectID` di luar helper (:370,:425,:509)
- [ ] `scada_service.go`: list diagram + binding-options `includeSubtree`; endpoint `GET /api/scada/projects/{id}/status-rollup`
- [ ] Node service: validasi attach `type IN (dma,site)`; report controller: resolusi projectId→subtree
- [ ] `widget_builder_controller.go`: resolusi `scope{type,id}` dari `config_json` → subtree channel ids
- [ ] Test integrasi roll-up (branch ⊇ Σ dma) + test tenant scoping tak berubah

### Fase 2 — SDK + Angular
- [ ] SDK manual-edit: DTO project + params baru (`type`,`parentId`,`rootOnly`,`includeSubtree`) + method tree/children/status-rollup (catat di memory: nama param terkunci)
- [ ] `report-project.ts` interface + `project-context.service.ts` (`ActiveProject.type`)
- [ ] Komponen shared `project-tree-select` (skill `ui-form`/`ui-list`)
- [ ] `projects-list` (tampilan tree + badge type), `projects-add` (type + parent cascade)
- [ ] `project-workspace` sidebar subtree; analytics-page opsi diagram sub-level
- [ ] Dashboard + dashboard-kedua: ganti dropdown ke tree-select (widget `@Input projectId` tak disentuh)
- [ ] Widget-builder: `WidgetConfig.scope` + dashboard-modal tree-select
- [ ] Bersihkan hardcode `webgis-map.ts:92`, `pairing-workspace.ts:29`; pairing dropdown leaf-only
- [ ] Mobile: projects-list group per cabang, chip konteks level

### Fase 3 — SCADA drill-down + zone
- [ ] `DiagramPage.tsx`: konsumsi `:projectId`; `DiagramListPage.tsx`: list ber-filter + create dropdown tree
- [ ] `NodeConfigDrawer.tsx` `fetchChannels()`: kirim `projectId` (param SDK sudah ada)
- [ ] `config.drillDown {projectId, diagramId}` di node/zone (persist via jsonb, pola `transform`) + navigasi
- [ ] `ZoneNode.tsx` mode `projectRef` + store polling roll-up (batch per diagram; selector zustand v5 stabil)
- [ ] Zone auto-generate dari children project (aksi di editor)
- [ ] Putuskan & implement Q6 (navigasi embed)

### Fase 4 — Agregasi widget / NRW
- [ ] Widget roll-up subtree end-to-end (scope → Postgres resolve → ClickHouse)
- [ ] iot-ai-nrw: definisi DMA = project `type='dma'`; keputusan Q4 (penandaan inflow/outflow); job NRW/MNF per-DMA
- [ ] Endpoint Go read-only NRW + Σ subtree (dok 08 iot-ai-nrw)
- [ ] UI NRW per cabang (desktop + mobile Helios)

---

*Semua path & nomor baris di dokumen ini hasil penelusuran kode nyata per 2026-07-07
(iot-backend-go, iot-angular, iot-scada, iot-ai-nrw). Nomor baris bisa bergeser — gunakan
simbol/fungsi yang disebut sebagai jangkar.*
