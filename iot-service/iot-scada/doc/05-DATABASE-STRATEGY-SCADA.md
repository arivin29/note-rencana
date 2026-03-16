# SCADA Database Strategy

> Document type: Pre-technical analysis  
> Status: Draft for discussion  
> Scope: Menentukan strategi database SCADA MVP agar ringan, tidak bentrok dengan schema existing, dan mudah dikembangkan

---

## 1. Tujuan dokumen

Dokumen ini mendefinisikan strategi database untuk domain SCADA.

Fokus utamanya:

- menentukan tabel inti SCADA
- menentukan field minimum MVP
- memutuskan mana yang relational dan mana yang `jsonb`
- memastikan tidak bentrok dengan schema existing
- menyiapkan jalur evolusi untuk fase berikutnya

Dokumen ini melanjutkan:

- [01-MVP-BOUNDARY-CHECKLIST.md](/Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/01-MVP-BOUNDARY-CHECKLIST.md)
- [02-DOMAIN-MODEL-SCADA.md](/Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/02-DOMAIN-MODEL-SCADA.md)
- [03-RUNTIME-DATA-FLOW-SCADA.md](/Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/03-RUNTIME-DATA-FLOW-SCADA.md)
- [04-AUTH-INTEGRATION-BLUEPRINT.md](/Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/04-AUTH-INTEGRATION-BLUEPRINT.md)

---

## 2. Prinsip database SCADA

Prinsip utama yang direkomendasikan:

- SCADA punya tabel sendiri
- SCADA tidak mengubah tabel telemetry existing
- topology diagram disimpan eksplisit
- konfigurasi visual tetap fleksibel
- runtime live value tidak disimpan ke tabel SCADA pada setiap polling

---

## 3. Apa yang tidak boleh dilakukan

Untuk MVP, sebaiknya tidak:

- menumpuk semua diagram ke satu kolom JSON besar tanpa entity topology
- mencampur tabel SCADA dengan `custom_dashboards` atau `custom_widgets`
- menyimpan nilai runtime live ke tabel SCADA setiap 5 detik
- menggandakan data telemetry existing ke domain SCADA tanpa alasan jelas

Alasan:

- akan membuat schema sulit diquery
- mempersulit evolusi relasi node-edge
- mencampur concern persistence dan runtime

---

## 4. Strategi penyimpanan yang direkomendasikan

Strategi yang direkomendasikan adalah:

- relational untuk struktur inti
- `jsonb` untuk config fleksibel

### 4.1 Yang harus relational

- diagram
- node
- edge
- binding
- relasi ke owner/project
- relasi binding ke `sensor_channel`

### 4.2 Yang sebaiknya `jsonb`

- canvas config
- runtime preference config
- style node
- style edge
- config spesifik per tipe node
- transform ringan binding

### 4.3 Kenapa pendekatan ini tepat

- sejalan dengan pola existing yang sudah memakai `jsonb`
- query tetap efisien untuk kebutuhan topology
- perubahan visual tidak memaksa migrasi schema setiap saat

---

## 5. Tabel inti MVP

Untuk MVP, saya rekomendasikan empat tabel inti:

- `scada_diagrams`
- `scada_nodes`
- `scada_edges`
- `scada_node_bindings`

Tabel opsional setelah MVP:

- `scada_versions`
- `scada_templates`
- `scada_permissions`
- `scada_alarm_rules`

---

## 6. Tabel 1: `scada_diagrams`

### 6.1 Fungsi

Menyimpan metadata diagram dan konteks bisnis diagram.

### 6.2 Field minimum yang direkomendasikan

- `id_scada_diagram`
- `id_owner`
- `id_project` nullable
- `name`
- `description`
- `diagram_code` nullable
- `status`
- `canvas_config`
- `runtime_config`
- `is_active`
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`

### 6.3 Catatan field

`status` bisa sederhana dulu:

- `draft`
- `active`
- `archived`

`canvas_config` bisa memuat:

- default viewport
- show grid
- snap setting
- background mode

`runtime_config` bisa memuat:

- polling interval
- stale timeout
- show animation

### 6.4 Constraint yang direkomendasikan

- foreign key ke `owners`
- foreign key ke `projects`
- index pada `id_owner`
- index pada `id_project`
- optional unique `(id_owner, diagram_code)` bila code dipakai

---

## 7. Tabel 2: `scada_nodes`

### 7.1 Fungsi

Menyimpan semua node visual dalam sebuah diagram.

### 7.2 Field minimum yang direkomendasikan

- `id_scada_node`
- `id_scada_diagram`
- `node_type`
- `label`
- `position_x`
- `position_y`
- `width`
- `height`
- `rotation_deg` nullable
- `z_index`
- `id_related_node` nullable
- `id_related_sensor` nullable
- `style_json`
- `config_json`
- `is_active`
- `created_at`
- `updated_at`

### 7.3 Kenapa tidak perlu `id_project` di tabel ini untuk MVP

Karena node sudah selalu berada di bawah diagram.

Kalau nanti perlu optimasi query atau denormalisasi, field itu masih bisa ditambahkan.

### 7.4 Constraint yang direkomendasikan

- foreign key ke `scada_diagrams`
- optional foreign key ke `nodes`
- optional foreign key ke `sensors`
- index pada `id_scada_diagram`
- index pada `node_type`

---

## 8. Tabel 3: `scada_edges`

### 8.1 Fungsi

Menyimpan hubungan antar node.

### 8.2 Field minimum yang direkomendasikan

- `id_scada_edge`
- `id_scada_diagram`
- `source_node_id`
- `target_node_id`
- `edge_type`
- `label` nullable
- `pipe_type`
- `flow_direction`
- `animated`
- `style_json`
- `config_json`
- `is_active`
- `created_at`
- `updated_at`

### 8.3 Constraint yang direkomendasikan

- foreign key ke `scada_diagrams`
- foreign key source ke `scada_nodes`
- foreign key target ke `scada_nodes`
- index pada `id_scada_diagram`
- index pada `(source_node_id, target_node_id)`

### 8.4 Catatan

Untuk MVP, `edge_type` bisa hampir selalu `pipe`.

Tetap disimpan sebagai field agar tidak menutup kemungkinan tipe edge lain di masa depan.

---

## 9. Tabel 4: `scada_node_bindings`

### 9.1 Fungsi

Menyimpan binding runtime antara node SCADA dan `sensor_channel`.

### 9.2 Field minimum yang direkomendasikan

- `id_scada_node_binding`
- `id_scada_node`
- `binding_key`
- `id_sensor_channel`
- `display_label` nullable
- `unit_override` nullable
- `transform_json` nullable
- `priority_order`
- `is_primary`
- `is_active`
- `created_at`
- `updated_at`

### 9.3 Constraint yang direkomendasikan

- foreign key ke `scada_nodes`
- foreign key ke `sensor_channels`
- index pada `id_scada_node`
- index pada `id_sensor_channel`
- optional unique `(id_scada_node, binding_key, id_sensor_channel)` sesuai aturan final

### 9.4 Kenapa binding perlu tabel terpisah

- mudah query semua channel yang dipakai diagram
- mudah validasi channel mana yang aktif
- mudah support multi-binding per node
- mudah diperluas nanti ke alarm atau role logic

---

## 10. Relasi ke tabel existing

Relasi yang direkomendasikan:

- `scada_diagrams.id_owner -> owners.id_owner`
- `scada_diagrams.id_project -> projects.id_project`
- `scada_nodes.id_related_node -> nodes.id_node`
- `scada_nodes.id_related_sensor -> sensors.id_sensor`
- `scada_node_bindings.id_sensor_channel -> sensor_channels.id_sensor_channel`

### 10.1 Kenapa tidak direct relation ke `sensor_types`

Karena `sensor_type` sudah bisa dicapai lewat `sensor_channel`.

Untuk MVP itu cukup, dan menjaga schema SCADA tetap ramping.

---

## 11. Kenapa tidak menyimpan runtime di database SCADA

Runtime live value tidak sebaiknya disimpan ke tabel SCADA karena:

- source telemetry sudah ada
- polling viewer akan sering
- data runtime cepat berubah
- persistence SCADA seharusnya fokus ke topology dan config

Yang sebaiknya disimpan di domain existing:

- histori telemetry
- alert event jika memang diproduksi backend alert engine

Yang sebaiknya tidak masuk DB SCADA MVP:

- latest value cache per node
- status warna viewer per refresh
- animation state runtime

---

## 12. Duplicate diagram strategy

Karena duplicate diagram mungkin dibutuhkan, schema harus mendukung copy yang bersih.

### 12.1 Yang harus ikut terduplikasi

- metadata diagram dasar
- seluruh node
- seluruh edge
- seluruh binding
- canvas config
- runtime config

### 12.2 Yang tidak perlu ikut terduplikasi

- runtime live state
- histori alarm
- audit runtime sementara

### 12.3 Implikasi ke schema

Primary key harus murni surrogate UUID.

Jangan gunakan identifier yang terlalu bergantung ke relasi lama, supaya cloning lebih mudah.

---

## 13. Draft/publish dan versioning

Untuk MVP, full versioning belum wajib.

Namun schema harus memberi ruang.

### 13.1 Opsi sederhana untuk fase awal

Pakai field `status` pada `scada_diagrams`.

### 13.2 Evolusi setelah MVP

Jika nanti perlu:

- tambah `scada_diagram_versions`
- atau gunakan snapshot JSON/relational clone dengan parent reference

### 13.3 Rekomendasi

Jangan masukkan version table sekarang jika belum benar-benar dipakai.

Tetapi:

- jangan gunakan desain yang mengunci satu diagram hanya bisa satu state selamanya

---

## 14. Naming strategy

Rekomendasi naming:

- gunakan prefix `scada_`
- gunakan pola yang konsisten dengan schema existing
- primary key bernama eksplisit

Contoh:

- `id_scada_diagram`
- `id_scada_node`
- `id_scada_edge`
- `id_scada_node_binding`

Ini lebih jelas daripada hanya `id`.

---

## 15. Soft delete vs hard delete

### 15.1 Rekomendasi MVP

Pakai pendekatan sederhana:

- `is_active`
- `status`

Hard delete fisik bisa tetap tersedia untuk operasi tertentu bila diperlukan internal.

### 15.2 Kenapa ini berguna

- lebih aman untuk user mistake
- mendukung archive diagram
- tidak terlalu kompleks seperti full audit/versioning

---

## 16. Audit trail

Untuk MVP, audit detail per node tidak wajib masuk schema SCADA khusus.

Jika sistem existing sudah punya audit log generik, itu lebih baik dimanfaatkan.

Yang minimal perlu dipertahankan:

- `created_by`
- `updated_by`
- `created_at`
- `updated_at`

Untuk `scada_nodes`, `scada_edges`, dan `scada_node_bindings`, field `updated_by` bisa dipertimbangkan nanti jika benar-benar dibutuhkan.

---

## 17. Query patterns yang harus didukung

Schema harus nyaman untuk query berikut:

- list diagram per project
- list diagram per owner
- load satu diagram beserta node, edge, binding
- ambil semua `sensor_channel` aktif untuk satu diagram
- duplicate satu diagram

Kalau empat query ini enak dilakukan, schema MVP sudah cukup sehat.

---

## 18. Index baseline yang direkomendasikan

Index minimum yang disarankan:

`scada_diagrams`

- `id_owner`
- `id_project`
- `status`

`scada_nodes`

- `id_scada_diagram`
- `node_type`

`scada_edges`

- `id_scada_diagram`
- `source_node_id`
- `target_node_id`

`scada_node_bindings`

- `id_scada_node`
- `id_sensor_channel`

---

## 19. Open questions

Topik yang masih perlu diputuskan:

- apakah `diagram_code` memang perlu sejak MVP
- apakah `updated_by` perlu di semua tabel
- apakah perlu field `sort_order` pada diagram list
- apakah duplicate diagram harus menyertakan relasi project yang sama secara default
- apakah nanti perlu `scada_groups` untuk grouping visual di canvas

---

## 20. Rekomendasi keputusan default

Baseline yang direkomendasikan:

- gunakan empat tabel inti: `scada_diagrams`, `scada_nodes`, `scada_edges`, `scada_node_bindings`
- topology disimpan relational
- style dan config disimpan dalam `jsonb`
- diagram terkait ke owner dan optional project
- binding wajib mengarah ke `sensor_channel`
- runtime state tidak disimpan ke tabel SCADA
- schema dibuat ringan untuk mendukung duplicate diagram dan evolusi versioning nanti

Jika baseline ini diterima, maka fondasi analisis pra-dokumen teknis sudah cukup matang untuk masuk ke:

- final alignment diskusi
- atau technical design document yang lebih implementatif
