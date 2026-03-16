# SCADA Decision Log

> Document type: Decision log  
> Status: Active  
> Scope: Ringkasan keputusan inti SCADA MVP

---

## 1. Tujuan dokumen

Dokumen ini merangkum keputusan penting SCADA MVP dalam satu tempat.

Gunanya:

- mempermudah alignment tim
- menghindari keputusan berubah diam-diam
- mempercepat onboarding
- menjadi referensi singkat saat implementasi

---

## 2. Product decisions

### D-001

Keputusan:

- SCADA adalah produk berbeda dari widget builder/reporting

Implikasi:

- tidak memakai model `custom_dashboard/custom_widget`
- tidak memakai pendekatan query-driven sebagai inti domain

Status:

- `final`

### D-002

Keputusan:

- SCADA MVP fokus monitoring only

Implikasi:

- command/control device ditunda ke tahap berikutnya

Status:

- `final`

### D-003

Keputusan:

- builder dan viewer sama-sama masuk fase pertama

Implikasi:

- produk harus usable untuk penyusunan diagram dan monitoring realtime

Status:

- `final`

### D-004

Keputusan:

- viewer adalah fullscreen operational screen

Implikasi:

- UX harus ringan, bersih, dan tidak terasa seperti admin panel

Status:

- `final`

---

## 3. Integration decisions

### D-005

Keputusan:

- SCADA frontend dibuat sebagai app terpisah penuh dari Angular

Implikasi:

- Angular tidak menjadi shell UI SCADA
- lifecycle deploy SCADA dapat dipisah

Status:

- `final`

### D-006

Keputusan:

- Angular menjadi launcher dari detail project

Implikasi:

- list SCADA tampil di halaman project
- user membuka viewer/edit dari Angular

Status:

- `final`

### D-007

Keputusan:

- auth source of truth tetap terpusat

Implikasi:

- SCADA tidak membuat sistem auth baru
- integrasi auth mengikuti sistem existing

Status:

- `final`

### D-008

Keputusan:

- jika shared cookie belum siap, pola auth fase awal yang direkomendasikan adalah launch token exchange

Implikasi:

- tidak disarankan mengirim bearer token mentah sebagai pola utama

Status:

- `recommended`

---

## 4. Domain decisions

### D-009

Keputusan:

- entity inti SCADA ada empat:
  - `scada_diagrams`
  - `scada_nodes`
  - `scada_edges`
  - `scada_node_bindings`

Implikasi:

- topology dan binding punya model yang jelas

Status:

- `final`

### D-010

Keputusan:

- binding utama berada di level `sensor_channel`

Implikasi:

- node boleh punya relasi konteks ke `node` atau `sensor`
- tetapi runtime binding utama tetap ke channel

Status:

- `final`

### D-011

Keputusan:

- `sensor_types` dipakai sebagai metadata penting untuk category, unit, precision, dan presentasi

Implikasi:

- SCADA perlu memanfaatkan metadata `sensor_type`
- tetapi tidak perlu menjadikannya FK langsung di domain SCADA

Status:

- `final`

### D-012

Keputusan:

- domain telemetry existing tetap jadi source of truth runtime

Implikasi:

- SCADA tidak menggandakan telemetry ke domain baru

Status:

- `final`

---

## 5. Persistence decisions

### D-013

Keputusan:

- persistence SCADA memakai hybrid relational + `jsonb`

Implikasi:

- topology tetap eksplisit
- visual config tetap fleksibel

Status:

- `final`

### D-014

Keputusan:

- runtime live value tidak disimpan ke tabel SCADA

Implikasi:

- tabel SCADA fokus ke topology dan config

Status:

- `final`

### D-015

Keputusan:

- diagram terkait ke owner dan optional project

Implikasi:

- project context penting
- tetapi schema tetap memberi ruang untuk skenario yang lebih fleksibel

Status:

- `final`

---

## 6. Save decisions

### D-016

Keputusan:

- save strategy MVP memakai full diagram save

Implikasi:

- frontend mengirim snapshot diagram utuh
- backend melakukan sync topology dalam satu transaction

Status:

- `final`

### D-017

Keputusan:

- autosave tidak dipakai di MVP

Implikasi:

- save manual harus jelas
- dirty state harus terlihat

Status:

- `final`

### D-018

Keputusan:

- duplicate diagram kemungkinan dibutuhkan

Implikasi:

- schema dan API harus mendukung cloning topology utuh

Status:

- `final`

---

## 7. Runtime decisions

### D-019

Keputusan:

- runtime memakai batch polling

Implikasi:

- tidak ada request per node
- polling dilakukan per diagram

Status:

- `final`

### D-020

Keputusan:

- runtime endpoint utama direkomendasikan by `diagramId`

Implikasi:

- backend menghitung binding aktif sendiri

Status:

- `final`

### D-021

Keputusan:

- nilai utama yang ditampilkan adalah `value_engineered`

Implikasi:

- frontend tidak perlu menghitung ulang `conversion_formula` untuk MVP

Status:

- `final`

### D-022

Keputusan:

- visual state node dihitung di frontend untuk MVP

Implikasi:

- backend cukup mengirim runtime payload + metadata penting

Status:

- `final`

---

## 8. Status model decisions

### D-023

Keputusan:

- status visual yang dibedakan:
  - `ok`
  - `warn`
  - `alert`
  - `off`
  - `offline`
  - `stale`
  - `unknown`

Status:

- `final`

### D-024

Keputusan:

- `off` dan `offline` harus dipisah tegas

Implikasi:

- `off` = non-running normal
- `offline` = koneksi/data tidak dapat dipercaya

Status:

- `final`

### D-025

Keputusan:

- prioritas visual direkomendasikan:
  - `offline`
  - `stale`
  - `alert`
  - `warn`
  - `off`
  - `ok`
  - `unknown`

Status:

- `recommended`

### D-026

Keputusan:

- threshold utama dibaca dari config node SCADA

Implikasi:

- metadata threshold sensor hanya menjadi default/helper

Status:

- `final`

---

## 9. UX decisions

### D-027

Keputusan:

- mode `view` dan `edit` berjalan dalam satu engine halaman

Implikasi:

- canvas tetap menjadi pusat pengalaman
- mode edit muncul sebagai layer kerja

Status:

- `final`

### D-028

Keputusan:

- route `view` dan `edit` tetap dipisah

Implikasi:

- deep link, permission, dan launch flow lebih jelas

Status:

- `final`

### D-029

Keputusan:

- edit mode memakai tool rail kecil di kiri dan drawer/property panel on-demand

Implikasi:

- UI tetap terasa ringan

Status:

- `final`

### D-030

Keputusan:

- mobile MVP fokus ke view mode dulu

Implikasi:

- edit mode tidak perlu dioptimalkan penuh untuk mobile pada fase awal

Status:

- `final`

---

## 10. Frontend decisions

### D-031

Keputusan:

- frontend stack utama:
  - React
  - TypeScript
  - React Flow
  - Zustand
  - Tailwind CSS

Status:

- `final`

### D-032

Keputusan:

- state frontend dipisah menjadi:
  - diagram persisted state
  - runtime state
  - UI state

Status:

- `final`

### D-033

Keputusan:

- store minimum:
  - `useDiagramStore`
  - `useRuntimeStore`
  - `useUiStore`

Status:

- `final`

---

## 11. Backend decisions

### D-034

Keputusan:

- SCADA dibuat sebagai module baru di backend existing

Status:

- `final`

### D-035

Keputusan:

- controller dipisah antara diagram CRUD dan runtime

Status:

- `final`

### D-036

Keputusan:

- service minimum backend:
  - `ScadaDiagramsService`
  - `ScadaRuntimeService`
  - `ScadaAccessService`
  - `ScadaMapperService`

Status:

- `final`

---

## 12. API decisions

### D-037

Keputusan:

- detail dan save diagram memakai full payload

Status:

- `final`

### D-038

Keputusan:

- bindings nested di dalam node pada payload detail/save

Status:

- `final`

### D-039

Keputusan:

- runtime response dibuat flat per binding

Status:

- `final`

### D-040

Keputusan:

- endpoint runtime utama:
  - `GET /api/scada/diagrams/:diagramId/runtime`

Status:

- `final`

---

## 13. Delivery decisions

### D-041

Keputusan:

- urutan implementasi utama:
  1. backend persistence and CRUD
  2. frontend canvas and save/load
  3. runtime polling
  4. widget visual
  5. Angular integration
  6. hardening

Status:

- `final`

### D-042

Keputusan:

- Angular integration tidak boleh menjadi blocker fondasi SCADA app

Status:

- `final`

---

## 14. Out of scope decisions

### D-043

Keputusan:

- berikut ini di luar MVP:
  - command/control
  - collaborative editing
  - template engine
  - versioning penuh
  - alarm workflow penuh
  - websocket runtime
  - export kompleks

Status:

- `final`

---

## 15. Open decisions

Keputusan yang masih bisa dipertajam nanti:

- definisi timeout final `stale`
- definisi timeout final `offline`
- aturan final `warn/alert` per widget type
- apakah duplicate diagram langsung `draft` atau ikut status sumber
- apakah delete diagram berarti `archived` atau hanya `is_active=false`

Status:

- `open`

---

## 16. Cara memakai decision log

Saat ada diskusi baru:

- jika keputusan baru mengubah baseline, update entry terkait
- jika keputusan baru hanya menjelaskan detail implementasi, cukup rujuk dokumen teknis
- jika ada konflik antar dokumen, decision log ini menjadi acuan singkat untuk menyelesaikan konflik lebih cepat
