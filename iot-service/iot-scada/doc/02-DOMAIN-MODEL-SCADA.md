# SCADA Domain Model

> Document type: Pre-technical analysis  
> Status: Draft for discussion  
> Scope: Menentukan model domain inti SCADA sebelum desain API, DB, dan frontend dirinci

---

## 1. Tujuan dokumen

Dokumen ini mendefinisikan model domain inti SCADA agar:

- tidak bentrok dengan domain telemetry existing
- tidak tercampur dengan domain widget/report builder
- cukup sederhana untuk MVP
- tetap mudah dikembangkan untuk kebutuhan tahap berikutnya

Dokumen ini adalah kelanjutan dari [01-MVP-BOUNDARY-CHECKLIST.md](/Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/01-MVP-BOUNDARY-CHECKLIST.md).

---

## 2. Prinsip domain

Prinsip yang dipakai untuk SCADA:

- SCADA adalah domain visual/topology, bukan domain telemetry
- source of truth data sensor tetap di entity existing
- source of truth diagram tetap di domain SCADA
- topology diagram harus eksplisit
- konfigurasi visual dan binding spesifik boleh fleksibel

Implikasinya:

- `owner`, `project`, `node`, `sensor`, `sensor_channel`, `sensor_log` tidak perlu diubah untuk MVP
- SCADA hanya menambah lapisan baru yang menghubungkan topology visual ke telemetry existing

---

## 3. Pemisahan domain dari sistem existing

### 3.1 Domain existing yang tetap dipakai

SCADA akan membaca context dan data dari domain existing berikut:

- `owners`
- `projects`
- `nodes`
- `sensors`
- `sensor_channels`
- `sensor_types`
- `sensor_logs`
- `alert_rules` dan `alert_events` hanya sebagai referensi masa depan

### 3.2 Domain yang tidak dipakai sebagai model inti SCADA

SCADA tidak memakai model inti dari:

- `custom_dashboards`
- `custom_widgets`

Alasan:

- model tersebut query-driven
- layout-nya grid-based
- orientasinya report/chart
- tidak punya konsep node-edge-topology

---

## 4. Entitas inti SCADA

Untuk MVP, domain SCADA direkomendasikan punya empat entitas inti:

- `scada_diagrams`
- `scada_nodes`
- `scada_edges`
- `scada_node_bindings`

Entity tambahan yang belum wajib untuk MVP:

- `scada_versions`
- `scada_templates`
- `scada_alarm_rules`
- `scada_diagram_permissions`

---

## 5. Entity 1: ScadaDiagram

### 5.1 Tujuan

Mewakili satu diagram SCADA utuh yang bisa dibuka di viewer atau editor.

### 5.2 Tanggung jawab

- menyimpan metadata diagram
- menyimpan association bisnis ke owner/project
- menyimpan canvas-level settings
- menjadi parent dari node dan edge

### 5.3 Field konseptual

Field inti yang direkomendasikan:

- `id`
- `id_owner`
- `id_project` nullable
- `name`
- `description`
- `diagram_code` opsional
- `status`
- `canvas_config_json`
- `runtime_config_json`
- `is_active`
- `created_by`
- `created_at`
- `updated_at`

### 5.4 Catatan desain

- `id_project` boleh nullable bila nanti dibutuhkan diagram lintas konteks
- tetapi untuk MVP, diagram tetap diasumsikan dibuka dari context project
- `canvas_config_json` dipakai untuk grid, viewport, background, snap setting, dan UI preference
- `runtime_config_json` dipakai untuk refresh interval dan runtime preference level diagram

### 5.5 Contoh isi konfigurasi diagram

`canvas_config_json`

- default zoom
- default viewport position
- show grid
- snap to grid
- background mode

`runtime_config_json`

- polling interval
- stale timeout
- show flow animation
- show alarm badges

---

## 6. Entity 2: ScadaNode

### 6.1 Tujuan

Mewakili satu aset atau komponen visual di diagram.

### 6.2 Tanggung jawab

- menyimpan posisi komponen di canvas
- menyimpan tipe node SCADA
- menyimpan label dan konfigurasi visual
- menjadi titik utama binding ke telemetry existing

### 6.3 Field konseptual

Field inti yang direkomendasikan:

- `id`
- `id_diagram`
- `node_type`
- `label`
- `position_x`
- `position_y`
- `width`
- `height`
- `rotation_deg` opsional
- `z_index`
- `id_project` opsional untuk denormalized query
- `id_related_node` nullable
- `id_related_sensor` nullable
- `style_json`
- `config_json`
- `is_active`
- `created_at`
- `updated_at`

### 6.4 Tipe node awal MVP

- `intake`
- `pump`
- `valve`
- `flowmeter`
- `pressure`
- `reservoir`
- `wtp`
- `junction`

Node tambahan tahap berikutnya:

- `label`
- `indicator`
- `group`
- `image`

### 6.5 Kenapa node perlu `id_related_node` dan `id_related_sensor`

Walau binding utama ada di `sensor_channel`, tetap berguna punya relasi konteks cepat:

- `id_related_node` untuk tahu aset/device induk
- `id_related_sensor` untuk tahu sensor utama bila ada

Ini bukan pengganti binding, hanya context helper.

### 6.6 Kenapa `config_json` tetap diperlukan

Karena setiap tipe node punya properti berbeda:

- `pump`: arah putar, status style, icon variant
- `valve`: open/close visual mode
- `reservoir`: fill orientation, high-low markers
- `wtp`: mode icon, state label

Kalau semua dipaksa jadi kolom relational, schema akan cepat gemuk dan kaku.

---

## 7. Entity 3: ScadaEdge

### 7.1 Tujuan

Mewakili koneksi antar node, biasanya berupa pipa atau aliran.

### 7.2 Tanggung jawab

- menyimpan topology source-target
- menyimpan jenis pipa
- menyimpan visual path dan behavior aliran

### 7.3 Field konseptual

Field inti yang direkomendasikan:

- `id`
- `id_diagram`
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

### 7.4 Nilai awal yang direkomendasikan

`edge_type`

- `pipe`

`pipe_type`

- `raw`
- `treated`

`flow_direction`

- `forward`
- `reverse`
- `bidirectional` nanti jika perlu

### 7.5 Catatan desain

- untuk MVP, edge tidak perlu punya binding sendiri
- aliran edge bisa dihitung dari node yang terhubung atau dari config edge sederhana
- jika nanti perlu, edge binding bisa ditambahkan tanpa merusak model inti

---

## 8. Peran `sensor_types` dalam domain SCADA

Informasi tambahan dari data existing menunjukkan bahwa `sensor_types` bukan sekadar kamus unit, tetapi juga membawa semantik pengukuran yang penting untuk SCADA.

Contoh yang sudah ada:

- pressure 4-20mA 0-5 bar
- pressure 4-20mA 0-16 bar
- pressure 0-10V 0-25 bar
- flow 4-20mA 0-100 m3/h
- flow 4-20mA 0-50 L/s

Setiap `sensor_type` dapat membawa:

- `category`
- `default_unit`
- `precision`
- `conversion_formula`

### 8.1 Kenapa ini penting untuk SCADA

SCADA viewer perlu memahami bukan hanya nilai raw binding, tetapi juga konteks tampilannya:

- apakah channel ini pressure, flow, level, current, atau power
- unit default yang layak ditampilkan
- jumlah digit desimal yang konsisten
- apakah nilai engineered sudah tersedia atau perlu perhatian pada formula konversi

### 8.2 Keputusan domain yang direkomendasikan

- binding utama SCADA tetap mengarah ke `sensor_channel`
- `sensor_type` tidak perlu dijadikan foreign key langsung di domain SCADA
- tetapi metadata `sensor_type` harus ikut dipertimbangkan saat runtime mapping dan UI presentation

### 8.3 Implikasi ke frontend dan runtime

Saat editor memilih binding `sensor_channel`, sistem idealnya juga mengetahui:

- kategori metric
- unit default
- precision default
- kemungkinan icon/status preset yang cocok

Contoh pemanfaatan:

- node `pressure` lebih mudah difilter ke channel dengan kategori pressure
- node `flowmeter` lebih mudah diarahkan ke channel flow/debit
- form binding bisa mengisi unit awal secara otomatis
- viewer bisa menampilkan angka dengan precision yang konsisten

### 8.4 Implikasi ke desain property panel

Property panel tidak harus memaksa user mengisi semua dari nol.

Yang lebih baik:

- ambil metadata dasar dari `sensor_channel -> sensor_type`
- izinkan override manual pada `unit`, `label`, atau display behavior bila diperlukan

### 8.5 Catatan penting

Jika `sensor_logs.value_engineered` sudah benar-benar menjadi source value utama yang ditampilkan, maka SCADA tidak perlu menghitung ulang `conversion_formula`.

Artinya:

- `conversion_formula` diperlakukan sebagai metadata referensi
- SCADA MVP sebaiknya menampilkan nilai engineered yang sudah tersedia
- evaluasi formula langsung di frontend tidak perlu menjadi bagian MVP

---

## 9. Entity 4: ScadaNodeBinding

### 8.1 Tujuan

Menyimpan mapping antara slot runtime pada node SCADA dengan `sensor_channel` existing.

Ini entity paling penting agar model tidak mentok di satu `sensor_id`.

### 8.2 Tanggung jawab

- mendefinisikan binding apa saja yang dipakai node
- menghubungkan binding ke `sensor_channel`
- menyimpan aturan presentasi atau transform ringan bila perlu

### 8.3 Field konseptual

Field inti yang direkomendasikan:

- `id`
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

### 8.4 Contoh `binding_key`

Untuk `pump`

- `status`
- `rpm`
- `current`
- `power`
- `fault`

Untuk `valve`

- `state`
- `opening`
- `fault`

Untuk `reservoir`

- `level`
- `inflow`
- `outflow`

Untuk `flowmeter`

- `flow`

Untuk `pressure`

- `pressure`

### 8.5 Kenapa binding dibuat tabel, bukan langsung JSONB saja

Alasan utama:

- mudah query seluruh channel yang dipakai satu diagram
- mudah validasi binding aktif
- mudah indeks ke `id_sensor_channel`
- lebih aman untuk batch polling

Tetap boleh ada `transform_json` per binding untuk fleksibilitas kecil.

---

## 10. Relasi antar entitas

Relasi yang direkomendasikan:

- satu `scada_diagram` punya banyak `scada_nodes`
- satu `scada_diagram` punya banyak `scada_edges`
- satu `scada_node` punya banyak `scada_node_bindings`
- satu `scada_edge` menghubungkan dua `scada_node`
- satu `scada_node_binding` menunjuk satu `sensor_channel`

Relasi ke domain existing:

- `scada_diagram -> project`
- `scada_node -> node` opsional
- `scada_node -> sensor` opsional
- `scada_node_binding -> sensor_channel` wajib

---

## 11. Model konseptual JSON yang dibutuhkan frontend

Walau persistence bersifat relational-hybrid, frontend tetap butuh model JSON yang nyaman dipakai.

### 10.1 Diagram JSON

Struktur konseptual:

- `diagram`
- `nodes[]`
- `edges[]`
- `meta`

### 10.2 Node JSON

Node minimal membawa:

- `id`
- `type`
- `position`
- `size`
- `label`
- `config`
- `bindings`

### 10.3 Edge JSON

Edge minimal membawa:

- `id`
- `source`
- `target`
- `pipeType`
- `flowDirection`
- `animated`
- `style`

### 10.4 Kenapa frontend tetap pakai JSON

- cocok dengan React Flow
- mudah save/load
- nyaman untuk edit state
- tidak memaksa frontend paham detail struktur tabel

Backend cukup bertugas mengubah relational model ke payload diagram JSON.

---

## 12. Hybrid persistence strategy

Model persistence yang direkomendasikan:

- kolom relational untuk struktur inti dan query penting
- `jsonb` untuk config fleksibel dan visual detail

### 11.1 Yang sebaiknya relational

- relasi diagram ke owner/project
- relasi node ke diagram
- relasi edge ke source/target
- relasi binding ke node dan `sensor_channel`
- posisi dan ukuran dasar node

### 11.2 Yang sebaiknya JSONB

- visual style
- property spesifik per jenis node
- transform ringan binding
- canvas preference
- runtime preference diagram

### 11.3 Alasan memilih hybrid

- lebih stabil untuk query
- tidak terlalu kaku
- sejalan dengan pola yang sudah dipakai sistem existing pada `config jsonb`

---

## 13. Association dengan project dan owner

Keputusan saat ini:

- SCADA tetap berada dalam context owner dan project
- list SCADA akan dibuka dari detail project di Angular

Rekomendasi domain:

- `id_owner` wajib di `scada_diagram`
- `id_project` sebaiknya ada dan nullable

Kenapa keduanya disimpan:

- owner penting untuk access boundary
- project penting untuk konteks bisnis dan navigasi
- nullable project memberi ruang bila nanti ada diagram lintas area

---

## 14. Hal yang sengaja belum dimasukkan ke model inti MVP

Item berikut belum perlu jadi entity terpisah pada fase awal:

- version history lengkap
- template library
- publish workflow
- alarm rule khusus SCADA
- command history
- comment/annotation system

Semua itu bisa ditambahkan nanti tanpa merusak empat entity inti di atas.

---

## 15. Open questions

Hal yang masih perlu dikunci dalam sesi berikutnya:

- apakah `scada_node` perlu field category bisnis selain `node_type`
- apakah `scada_edge` perlu binding di fase awal
- bagaimana format final `binding_key` per widget type
- apakah `id_project` pada node perlu disimpan atau cukup ikut diagram
- apakah duplicate diagram harus menyalin binding satu banding satu
- apakah satu diagram boleh tampil lintas project di masa depan

---

## 16. Rekomendasi keputusan default

Untuk melanjutkan ke dokumen berikutnya, baseline yang direkomendasikan:

- SCADA punya empat entity inti: diagram, node, edge, node_binding
- telemetry existing tetap jadi source of truth
- binding utama wajib ke `sensor_channel`
- `sensor_types` dipakai sebagai metadata penting untuk semantik tampilan, unit, dan precision
- project dan owner tetap jadi konteks bisnis utama
- persistence memakai pendekatan hybrid relational + JSONB
- frontend bekerja dengan diagram JSON, backend menyusun payload-nya

Jika baseline ini diterima, langkah berikutnya adalah menyusun:

`03-RUNTIME-DATA-FLOW-SCADA.md`

Dokumen itu akan menentukan:

- bagaimana batch polling bekerja
- bagaimana binding dikumpulkan per diagram
- bagaimana runtime state dipisahkan dari saved state
- bagaimana viewer dan mode edit membaca data live
