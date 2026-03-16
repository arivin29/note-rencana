# SCADA MVP Task Breakdown

> Document type: Delivery task breakdown  
> Status: Draft for discussion  
> Scope: Memecah implementasi SCADA MVP menjadi task yang operasional dan berurutan

---

## 1. Tujuan dokumen

Dokumen ini memecah implementation plan menjadi task yang lebih konkret agar:

- urutan kerja jelas
- dependency antar pekerjaan terlihat
- task bisa langsung dipakai untuk eksekusi
- scope MVP tetap terjaga

Dokumen ini bukan sprint plan final, tetapi cukup detail untuk dijadikan dasar pembagian kerja.

---

## 2. Cara membaca task breakdown

Setiap task dibagi dengan pola:

- `ID`
- `Task`
- `Tujuan`
- `Dependency`
- `Output`
- `Priority`

Priority yang dipakai:

- `P0`: wajib untuk MVP
- `P1`: penting tetapi bisa menyusul setelah fondasi stabil
- `P2`: nice to have dalam fase MVP akhir

---

## 3. Ringkasan urutan eksekusi

Urutan besar yang direkomendasikan:

1. persistence foundation
2. diagram CRUD
3. frontend shell dan canvas
4. full save/load flow
5. runtime polling
6. widget visual dasar
7. property editing
8. Angular launch integration
9. duplicate dan hardening

---

## 4. Backend foundation tasks

### B-001

Task:

- buat module SCADA baru di backend existing

Tujuan:

- memisahkan bounded context SCADA dari widget builder

Dependency:

- tidak ada

Output:

- struktur folder module SCADA tersedia

Priority:

- `P0`

Status implementasi 2026-03-16:

- `done`

### B-002

Task:

- buat entity backend untuk `scada_diagrams`

Tujuan:

- fondasi persistence diagram

Dependency:

- `B-001`

Output:

- entity diagram siap dipakai repository

Priority:

- `P0`

Status implementasi 2026-03-16:

- `done`

### B-003

Task:

- buat entity backend untuk `scada_nodes`

Tujuan:

- persistence node topology

Dependency:

- `B-001`

Output:

- entity node siap

Priority:

- `P0`

Status implementasi 2026-03-16:

- `done`

### B-004

Task:

- buat entity backend untuk `scada_edges`

Tujuan:

- persistence edge topology

Dependency:

- `B-001`

Output:

- entity edge siap

Priority:

- `P0`

Status implementasi 2026-03-16:

- `done`

### B-005

Task:

- buat entity backend untuk `scada_node_bindings`

Tujuan:

- persistence binding ke `sensor_channel`

Dependency:

- `B-001`

Output:

- entity binding siap

Priority:

- `P0`

Status implementasi 2026-03-16:

- `done`

### B-006

Task:

- buat migration semua tabel SCADA

Tujuan:

- menyiapkan schema database MVP

Dependency:

- `B-002`, `B-003`, `B-004`, `B-005`

Output:

- migration create table dan index

Priority:

- `P0`

Status implementasi 2026-03-16:

- `done`

Catatan:

- migration file sudah dibuat di backend
- karena target DB adalah production dan chain migration lama belum sinkron, schema SCADA diterapkan langsung via DDL terkontrol

---

## 5. Backend CRUD tasks

### B-007

Task:

- buat DTO create/list/detail/update/duplicate diagram

Tujuan:

- kontrak API diagram stabil

Dependency:

- `B-001`

Output:

- DTO request/response siap

Priority:

- `P0`

Status implementasi 2026-03-16:

- `done`

### B-008

Task:

- implement `ScadaAccessService`

Tujuan:

- validasi read/edit access per project/diagram

Dependency:

- `B-001`

Output:

- service access validation siap

Priority:

- `P0`

Status implementasi 2026-03-16:

- `done`

### B-009

Task:

- implement `ScadaMapperService`

Tujuan:

- map entity ke payload diagram JSON

Dependency:

- `B-002`, `B-003`, `B-004`, `B-005`

Output:

- mapper detail diagram dan runtime siap

Priority:

- `P0`

Status implementasi 2026-03-16:

- `done`

### B-010

Task:

- implement create diagram API

Tujuan:

- diagram baru bisa dibuat

Dependency:

- `B-007`, `B-008`

Output:

- `POST /api/scada/diagrams`

Priority:

- `P0`

### B-011

Task:

- implement list diagram API

Tujuan:

- diagram bisa dilihat per project/owner

Dependency:

- `B-007`, `B-008`

Output:

- `GET /api/scada/diagrams`

Priority:

- `P0`

### B-012

Task:

- implement get diagram detail API

Tujuan:

- frontend bisa load diagram lengkap

Dependency:

- `B-007`, `B-008`, `B-009`

Output:

- `GET /api/scada/diagrams/:diagramId`

Priority:

- `P0`

### B-013

Task:

- implement full diagram save transaction

Tujuan:

- update diagram, node, edge, binding dalam satu transaction

Dependency:

- `B-007`, `B-008`, `B-009`, `B-012`

Output:

- `PUT /api/scada/diagrams/:diagramId`

Priority:

- `P0`

### B-014

Task:

- implement archive/delete diagram API

Tujuan:

- diagram bisa dinonaktifkan

Dependency:

- `B-008`

Output:

- `DELETE /api/scada/diagrams/:diagramId`

Priority:

- `P1`

### B-015

Task:

- implement duplicate diagram API

Tujuan:

- clone diagram beserta topology dan binding

Dependency:

- `B-012`, `B-013`

Output:

- `POST /api/scada/diagrams/:diagramId/duplicate`

Priority:

- `P1`

---

## 6. Backend runtime tasks

### B-016

Task:

- implement `ScadaRuntimeService`

Tujuan:

- runtime flow batch by `diagramId`

Dependency:

- `B-005`, `B-008`

Output:

- service runtime siap

Priority:

- `P0`

### B-017

Task:

- implement latest telemetry query per `sensor_channel`

Tujuan:

- ambil latest value batch dari telemetry existing

Dependency:

- `B-016`

Output:

- query runtime batch siap

Priority:

- `P0`

### B-018

Task:

- implement runtime endpoint

Tujuan:

- frontend bisa polling by `diagramId`

Dependency:

- `B-016`, `B-017`, `B-009`

Output:

- `GET /api/scada/diagrams/:diagramId/runtime`

Priority:

- `P0`

### B-019

Task:

- tambahkan error handling dan logging runtime

Tujuan:

- runtime failure tidak opaque

Dependency:

- `B-018`

Output:

- logging dan error code runtime lebih rapi

Priority:

- `P1`

---

## 7. Frontend foundation tasks

### F-001

Task:

- setup struktur React app SCADA

Tujuan:

- fondasi frontend bersih

Dependency:

- tidak ada

Output:

- struktur folder awal siap

Priority:

- `P0`

### F-002

Task:

- setup routing `view` dan `edit`

Tujuan:

- mode route final tersedia

Dependency:

- `F-001`

Output:

- route diagram view/edit siap

Priority:

- `P0`

### F-003

Task:

- setup shell fullscreen SCADA

Tujuan:

- top bar dan layout utama tersedia

Dependency:

- `F-001`

Output:

- shell fullscreen siap

Priority:

- `P0`

### F-004

Task:

- setup React Flow canvas wrapper

Tujuan:

- canvas foundation tersedia

Dependency:

- `F-001`

Output:

- canvas dasar siap

Priority:

- `P0`

### F-005

Task:

- buat `useDiagramStore`

Tujuan:

- state persisted diagram terpisah

Dependency:

- `F-001`

Output:

- diagram store siap

Priority:

- `P0`

### F-006

Task:

- buat `useRuntimeStore`

Tujuan:

- state runtime terpisah

Dependency:

- `F-001`

Output:

- runtime store siap

Priority:

- `P0`

### F-007

Task:

- buat `useUiStore`

Tujuan:

- state selection/tool/panel terpisah

Dependency:

- `F-001`

Output:

- UI store siap

Priority:

- `P0`

---

## 8. Frontend editor tasks

### F-008

Task:

- render diagram payload ke canvas

Tujuan:

- frontend bisa load diagram dari backend

Dependency:

- `F-004`, `F-005`, `B-012`

Output:

- diagram existing tampil

Priority:

- `P0`

### F-009

Task:

- implement mode toggle view/edit

Tujuan:

- satu engine dua mode berjalan

Dependency:

- `F-002`, `F-003`, `F-007`

Output:

- toggle edit tersedia

Priority:

- `P0`

### F-010

Task:

- implement selection node/edge

Tujuan:

- user bisa memilih object untuk edit

Dependency:

- `F-004`, `F-007`

Output:

- selection logic siap

Priority:

- `P0`

### F-011

Task:

- implement add node flow

Tujuan:

- user bisa menambah node ke canvas

Dependency:

- `F-004`, `F-005`, `F-007`

Output:

- add node usable

Priority:

- `P0`

### F-012

Task:

- implement connect edge flow

Tujuan:

- user bisa membuat pipa antar node

Dependency:

- `F-004`, `F-005`

Output:

- add edge usable

Priority:

- `P0`

### F-013

Task:

- implement move/delete node dan edge

Tujuan:

- topology bisa diedit penuh

Dependency:

- `F-010`, `F-011`, `F-012`

Output:

- edit topology usable

Priority:

- `P0`

### F-014

Task:

- implement dirty state dan save UX

Tujuan:

- save manual sesuai keputusan arsitektur

Dependency:

- `F-005`, `F-007`, `B-013`

Output:

- save button, unsaved changes, discard confirm

Priority:

- `P0`

### F-015

Task:

- integrasikan full save/load API

Tujuan:

- editor end-to-end berjalan

Dependency:

- `F-008`, `F-014`, `B-010`, `B-012`, `B-013`

Output:

- create/edit/save/reload diagram berjalan

Priority:

- `P0`

---

## 9. Frontend runtime tasks

### F-016

Task:

- implement runtime polling module

Tujuan:

- viewer bisa request runtime per interval

Dependency:

- `F-006`, `B-018`

Output:

- polling loop berjalan

Priority:

- `P0`

### F-017

Task:

- map runtime binding response ke node runtime state

Tujuan:

- node bisa menerima latest value dan metadata

Dependency:

- `F-016`

Output:

- runtime mapping siap

Priority:

- `P0`

### F-018

Task:

- implement visual status evaluation dasar

Tujuan:

- status `ok/offline/stale/off/unknown` tampil

Dependency:

- `F-017`

Output:

- status visual node dasar siap

Priority:

- `P0`

### F-019

Task:

- tampilkan latest values pada node

Tujuan:

- viewer benar-benar informatif

Dependency:

- `F-017`

Output:

- nilai live tampil di canvas

Priority:

- `P0`

---

## 10. Widget visual tasks

### F-020

Task:

- implement node visual placeholder bersama

Tujuan:

- fondasi semua node type konsisten

Dependency:

- `F-008`

Output:

- shared node frame siap

Priority:

- `P0`

### F-021

Task:

- implement `pump`

Dependency:

- `F-020`, `F-019`

Output:

- pump widget usable

Priority:

- `P0`

### F-022

Task:

- implement `valve`

Dependency:

- `F-020`, `F-019`

Output:

- valve widget usable

Priority:

- `P0`

### F-023

Task:

- implement `flowmeter`

Dependency:

- `F-020`, `F-019`

Output:

- flowmeter widget usable

Priority:

- `P0`

### F-024

Task:

- implement `pressure`

Dependency:

- `F-020`, `F-019`

Output:

- pressure widget usable

Priority:

- `P0`

### F-025

Task:

- implement `reservoir`

Dependency:

- `F-020`, `F-019`

Output:

- reservoir widget usable

Priority:

- `P0`

### F-026

Task:

- implement `intake`

Dependency:

- `F-020`, `F-019`

Output:

- intake widget usable

Priority:

- `P1`

### F-027

Task:

- implement `wtp`

Dependency:

- `F-020`, `F-019`

Output:

- wtp widget usable

Priority:

- `P1`

### F-028

Task:

- implement `junction`

Dependency:

- `F-020`

Output:

- junction widget usable

Priority:

- `P0`

### F-029

Task:

- implement pipe edge visual

Dependency:

- `F-012`

Output:

- pipe edge dengan warna raw/treated

Priority:

- `P0`

### F-030

Task:

- implement flow animation sederhana

Dependency:

- `F-029`

Output:

- animasi edge dasar

Priority:

- `P1`

---

## 11. Property panel tasks

### F-031

Task:

- buat inspector context-sensitive

Tujuan:

- panel kanan berubah sesuai selection

Dependency:

- `F-010`, `F-007`

Output:

- inspector shell siap

Priority:

- `P0`

### F-032

Task:

- implement form property node dasar

Tujuan:

- edit label, size/config ringan

Dependency:

- `F-031`

Output:

- node property editor siap

Priority:

- `P0`

### F-033

Task:

- implement form binding editor

Tujuan:

- pilih `sensor_channel` untuk binding node

Dependency:

- `F-031`

Output:

- binding editor usable

Priority:

- `P0`

### F-034

Task:

- implement threshold form dasar

Tujuan:

- status warn/alert siap berkembang

Dependency:

- `F-032`

Output:

- threshold config dasar siap

Priority:

- `P1`

### F-035

Task:

- implement edge property form

Tujuan:

- edit pipe type, direction, animation

Dependency:

- `F-031`

Output:

- edge property editor siap

Priority:

- `P0`

---

## 12. Angular integration tasks

### I-001

Task:

- tampilkan list SCADA di detail project Angular

Tujuan:

- menyediakan entry point bisnis

Dependency:

- `B-011`

Output:

- list diagram tampil di Angular

Priority:

- `P1`

### I-002

Task:

- buat action open viewer/edit dari Angular

Tujuan:

- user bisa pindah ke app SCADA

Dependency:

- `I-001`

Output:

- tombol/link open SCADA tersedia

Priority:

- `P1`

### I-003

Task:

- validasi auth/session flow lintas frontend

Tujuan:

- akses SCADA dari Angular tidak putus

Dependency:

- `I-002`

Output:

- launch flow berjalan

Priority:

- `P1`

---

## 13. Hardening tasks

### H-001

Task:

- implement duplicate diagram UI + API integration

Dependency:

- `B-015`, `F-015`

Output:

- duplicate usable

Priority:

- `P1`

### H-002

Task:

- improve load/save/runtime error state

Dependency:

- `F-015`, `F-016`

Output:

- UX error lebih rapi

Priority:

- `P1`

### H-003

Task:

- improve empty state dan first-use state

Dependency:

- `F-015`

Output:

- onboarding dasar lebih baik

Priority:

- `P2`

### H-004

Task:

- optimize rerender/runtime performance dasar

Dependency:

- `F-016`, `F-017`, `F-019`

Output:

- polling lebih stabil

Priority:

- `P1`

---

## 14. Milestone mapping

### Milestone 1

- `B-001` s.d. `B-013`
- `F-001` s.d. `F-015`

Hasil:

- editor save/load end-to-end

### Milestone 2

- `B-016` s.d. `B-018`
- `F-016` s.d. `F-019`

Hasil:

- runtime live data end-to-end

### Milestone 3

- `F-020` s.d. `F-035`

Hasil:

- widget visual dasar dan property editing usable

### Milestone 4

- `I-001` s.d. `I-003`
- `H-001` s.d. `H-004`

Hasil:

- integration dan hardening siap demo

---

## 15. Task yang jangan dikerjakan terlalu dini

Tahan dulu task berikut:

- template diagram
- versioning penuh
- websocket runtime
- collaborative editing
- alarm workflow lengkap
- mobile edit penuh
- export PNG/PDF

---

## 16. Rekomendasi task awal paling aman

Kalau harus memilih 10 task pertama paling penting:

1. `B-001`
2. `B-002`
3. `B-003`
4. `B-004`
5. `B-005`
6. `B-006`
7. `B-007`
8. `F-001`
9. `F-004`
10. `F-005`

Setelah itu lanjut:

- `B-012`
- `B-013`
- `F-008`
- `F-014`
- `F-015`

---

## 17. Rekomendasi keputusan default

Baseline task breakdown yang direkomendasikan:

- mulai dari backend schema dan CRUD
- lanjut ke frontend canvas dan full save/load
- baru runtime polling
- baru widget visual dan property editor
- Angular integration dilakukan setelah SCADA app stabil sendiri

Jika baseline ini diterima, maka fase diskusi perencanaan sudah cukup matang untuk berpindah ke:

- execution-ready checklist
- atau langsung mulai implementasi bertahap nanti
