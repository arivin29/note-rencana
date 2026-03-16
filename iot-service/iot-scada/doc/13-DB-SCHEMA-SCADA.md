# SCADA DB Schema

> Document type: Technical design draft  
> Status: Draft for discussion  
> Scope: Rancangan schema database SCADA MVP

---

## 1. Tujuan dokumen

Dokumen ini mendefinisikan rancangan schema database SCADA yang konkret untuk MVP.

Fokusnya:

- nama tabel final
- kolom dan tipe data
- foreign key
- index minimum
- catatan implementasi migration

Dokumen ini adalah turunan langsung dari strategi database dan domain model yang sudah dibahas sebelumnya.

---

## 2. Prinsip schema

Prinsip yang dipakai:

- topology disimpan relational
- style dan config disimpan di `jsonb`
- binding ke telemetry existing dilakukan lewat `sensor_channels`
- runtime live value tidak disimpan di tabel SCADA
- schema dibuat ringan tetapi tidak buntu untuk evolusi

---

## 3. Daftar tabel MVP

Schema minimum yang direkomendasikan:

- `scada_diagrams`
- `scada_nodes`
- `scada_edges`
- `scada_node_bindings`

---

## 4. Tabel `scada_diagrams`

### 4.1 Fungsi

Menyimpan metadata diagram SCADA.

### 4.2 Kolom yang direkomendasikan

| Kolom | Tipe | Nullable | Keterangan |
|---|---|---|---|
| `id_scada_diagram` | `uuid` | no | primary key |
| `id_owner` | `uuid` | no | relasi ke owner |
| `id_project` | `uuid` | yes | relasi ke project |
| `name` | `varchar(255)` | no | nama diagram |
| `description` | `text` | yes | deskripsi diagram |
| `diagram_code` | `varchar(100)` | yes | code opsional |
| `status` | `varchar(20)` | no | `draft`, `active`, `archived` |
| `canvas_config` | `jsonb` | no | default `{}` |
| `runtime_config` | `jsonb` | no | default `{}` |
| `is_active` | `boolean` | no | default `true` |
| `created_by` | `uuid` | yes | user pembuat |
| `updated_by` | `uuid` | yes | user update terakhir |
| `created_at` | `timestamptz` | no | default now |
| `updated_at` | `timestamptz` | no | default now |

### 4.3 Constraint yang direkomendasikan

- primary key: `id_scada_diagram`
- foreign key `id_owner -> owners.id_owner`
- foreign key `id_project -> projects.id_project`
- foreign key `created_by -> users.id_user` jika user table tersedia
- foreign key `updated_by -> users.id_user` jika user table tersedia

### 4.4 Index minimum

- index `id_owner`
- index `id_project`
- index `status`
- unique optional `(id_owner, diagram_code)` jika code dipakai

---

## 5. Tabel `scada_nodes`

### 5.1 Fungsi

Menyimpan semua node visual di dalam diagram.

### 5.2 Kolom yang direkomendasikan

| Kolom | Tipe | Nullable | Keterangan |
|---|---|---|---|
| `id_scada_node` | `uuid` | no | primary key |
| `id_scada_diagram` | `uuid` | no | parent diagram |
| `node_type` | `varchar(50)` | no | `pump`, `valve`, dll |
| `label` | `varchar(255)` | no | label node |
| `position_x` | `double precision` | no | posisi x canvas |
| `position_y` | `double precision` | no | posisi y canvas |
| `width` | `double precision` | no | lebar node |
| `height` | `double precision` | no | tinggi node |
| `rotation_deg` | `double precision` | yes | rotasi |
| `z_index` | `integer` | no | urutan layer |
| `id_related_node` | `uuid` | yes | relasi ke `nodes` existing |
| `id_related_sensor` | `uuid` | yes | relasi ke `sensors` existing |
| `style_json` | `jsonb` | no | default `{}` |
| `config_json` | `jsonb` | no | default `{}` |
| `is_active` | `boolean` | no | default `true` |
| `created_at` | `timestamptz` | no | default now |
| `updated_at` | `timestamptz` | no | default now |

### 5.3 Constraint yang direkomendasikan

- primary key: `id_scada_node`
- foreign key `id_scada_diagram -> scada_diagrams.id_scada_diagram`
- foreign key `id_related_node -> nodes.id_node`
- foreign key `id_related_sensor -> sensors.id_sensor`

### 5.4 Index minimum

- index `id_scada_diagram`
- index `node_type`
- index `id_related_node`
- index `id_related_sensor`

---

## 6. Tabel `scada_edges`

### 6.1 Fungsi

Menyimpan relasi antar node di diagram.

### 6.2 Kolom yang direkomendasikan

| Kolom | Tipe | Nullable | Keterangan |
|---|---|---|---|
| `id_scada_edge` | `uuid` | no | primary key |
| `id_scada_diagram` | `uuid` | no | parent diagram |
| `source_node_id` | `uuid` | no | FK ke node sumber |
| `target_node_id` | `uuid` | no | FK ke node target |
| `edge_type` | `varchar(50)` | no | default `pipe` |
| `label` | `varchar(255)` | yes | label edge |
| `pipe_type` | `varchar(20)` | yes | `raw`, `treated` |
| `flow_direction` | `varchar(20)` | yes | `forward`, `reverse` |
| `animated` | `boolean` | no | default `false` |
| `style_json` | `jsonb` | no | default `{}` |
| `config_json` | `jsonb` | no | default `{}` |
| `is_active` | `boolean` | no | default `true` |
| `created_at` | `timestamptz` | no | default now |
| `updated_at` | `timestamptz` | no | default now |

### 6.3 Constraint yang direkomendasikan

- primary key: `id_scada_edge`
- foreign key `id_scada_diagram -> scada_diagrams.id_scada_diagram`
- foreign key `source_node_id -> scada_nodes.id_scada_node`
- foreign key `target_node_id -> scada_nodes.id_scada_node`

### 6.4 Index minimum

- index `id_scada_diagram`
- index `source_node_id`
- index `target_node_id`
- optional composite index `(source_node_id, target_node_id)`

---

## 7. Tabel `scada_node_bindings`

### 7.1 Fungsi

Menyimpan binding antara node SCADA dan `sensor_channel`.

### 7.2 Kolom yang direkomendasikan

| Kolom | Tipe | Nullable | Keterangan |
|---|---|---|---|
| `id_scada_node_binding` | `uuid` | no | primary key |
| `id_scada_node` | `uuid` | no | parent node |
| `binding_key` | `varchar(100)` | no | `status`, `rpm`, `pressure`, dll |
| `id_sensor_channel` | `uuid` | no | FK ke `sensor_channels` |
| `display_label` | `varchar(255)` | yes | label override |
| `unit_override` | `varchar(50)` | yes | unit override |
| `transform_json` | `jsonb` | yes | transform ringan |
| `priority_order` | `integer` | no | default 0 |
| `is_primary` | `boolean` | no | default `false` |
| `is_active` | `boolean` | no | default `true` |
| `created_at` | `timestamptz` | no | default now |
| `updated_at` | `timestamptz` | no | default now |

### 7.3 Constraint yang direkomendasikan

- primary key: `id_scada_node_binding`
- foreign key `id_scada_node -> scada_nodes.id_scada_node`
- foreign key `id_sensor_channel -> sensor_channels.id_sensor_channel`

### 7.4 Unique/index minimum

- index `id_scada_node`
- index `id_sensor_channel`
- optional unique `(id_scada_node, binding_key, id_sensor_channel)`

Jika nanti satu node tidak boleh punya dua binding key yang sama, unique constraint bisa diperketat menjadi:

- unique `(id_scada_node, binding_key)`

Tetapi untuk MVP saya sarankan jangan terlalu ketat dulu sebelum aturan widget final benar-benar stabil.

---

## 8. Enumerasi konseptual yang direkomendasikan

Untuk MVP, enum database native tidak wajib.

Lebih pragmatis memakai `varchar` + validasi aplikasi untuk:

- `status`
- `node_type`
- `edge_type`
- `pipe_type`
- `flow_direction`

### 8.1 Kenapa ini direkomendasikan

- migrasi lebih mudah
- perubahan daftar value lebih fleksibel
- cocok untuk fase MVP yang masih berkembang

---

## 9. Default value yang direkomendasikan

### 9.1 `scada_diagrams`

- `status = 'draft'`
- `canvas_config = '{}'::jsonb`
- `runtime_config = '{}'::jsonb`
- `is_active = true`

### 9.2 `scada_nodes`

- `z_index = 0`
- `style_json = '{}'::jsonb`
- `config_json = '{}'::jsonb`
- `is_active = true`

### 9.3 `scada_edges`

- `edge_type = 'pipe'`
- `animated = false`
- `style_json = '{}'::jsonb`
- `config_json = '{}'::jsonb`
- `is_active = true`

### 9.4 `scada_node_bindings`

- `priority_order = 0`
- `is_primary = false`
- `is_active = true`

---

## 10. Delete strategy

### 10.1 Diagram

Rekomendasi:

- `DELETE` secara business logic berarti archive / deactivate

Implementasi:

- update `status = 'archived'`
- atau `is_active = false`

### 10.2 Nodes, edges, bindings

Saat full diagram save:

- child item yang hilang dari payload dapat dihapus secara hard delete

Alasan:

- lebih sederhana untuk MVP
- child entities bergantung penuh pada diagram topology saat ini

Jika nanti versioning masuk, strategi ini bisa berubah.

---

## 11. Audit field

### 11.1 Yang direkomendasikan sekarang

Minimal:

- `created_at`
- `updated_at`

Di `scada_diagrams`:

- `created_by`
- `updated_by`

### 11.2 Yang belum wajib

- `created_by` dan `updated_by` pada semua child table

Ini bisa ditambah nanti jika benar-benar diperlukan.

---

## 12. Query pattern yang harus nyaman didukung

Schema ini harus nyaman untuk query:

- list diagram per project
- load satu diagram lengkap
- ambil semua binding aktif per diagram
- duplicate diagram
- load runtime channel ids per diagram

Jika query ini efisien, schema MVP sudah cukup sehat.

---

## 13. Struktur migration yang direkomendasikan

Urutan migration yang sehat:

1. create `scada_diagrams`
2. create `scada_nodes`
3. create `scada_edges`
4. create `scada_node_bindings`
5. create indexes

### 13.1 Catatan

Jika menggunakan TypeORM migrations:

- buat migration terpisah yang fokus hanya pada domain SCADA
- jangan gabungkan dengan perubahan widget builder atau telemetry

---

## 14. Catatan relasi ke telemetry existing

Schema SCADA sengaja tidak menyimpan:

- `sensor_type_id`
- `sensor_log_id`
- latest runtime value

Karena:

- `sensor_type` bisa didapat dari `sensor_channel`
- runtime value harus diambil dari domain telemetry existing
- ini menjaga domain SCADA tetap bersih

---

## 15. Contoh DDL konseptual singkat

Contoh bentuk konseptual:

```sql
create table scada_diagrams (...);
create table scada_nodes (...);
create table scada_edges (...);
create table scada_node_bindings (...);
```

Dokumen ini sengaja belum menuliskan DDL SQL final penuh supaya tetap mudah disesuaikan saat technical design final diturunkan ke migration.

---

## 16. Open questions

Masih perlu diputuskan:

- apakah `diagram_code` benar-benar diperlukan sejak MVP
- apakah `updated_by` di diagram wajib sejak hari pertama
- apakah child delete pakai hard delete final atau `is_active=false`
- apakah perlu `sort_order` untuk daftar diagram

---

## 17. Rekomendasi keputusan default

Baseline DB schema yang direkomendasikan:

- gunakan empat tabel inti:
  - `scada_diagrams`
  - `scada_nodes`
  - `scada_edges`
  - `scada_node_bindings`
- topology disimpan relational
- style/config disimpan di `jsonb`
- binding ke telemetry existing melalui `sensor_channels`
- runtime value tidak disimpan di tabel SCADA
- enum database native tidak wajib untuk MVP

Jika baseline ini diterima, maka rangkaian technical design dasar SCADA sudah cukup lengkap untuk mulai diturunkan ke:

- migration draft
- DTO draft
- frontend type draft
- backend module implementation plan
