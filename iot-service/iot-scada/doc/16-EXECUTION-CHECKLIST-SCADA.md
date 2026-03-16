# SCADA Execution Checklist

> Document type: Execution checklist  
> Status: Draft for execution readiness  
> Scope: Checklist ringkas untuk memulai dan mengawal implementasi SCADA MVP

---

## 1. Tujuan dokumen

Dokumen ini adalah versi ringkas dari seluruh paket perencanaan SCADA.

Gunanya:

- memastikan implementasi dimulai dari fondasi yang benar
- mempermudah tracking progres
- mencegah loncat ke pekerjaan yang belum waktunya

---

## 2. Checklist pra-eksekusi

Sebelum mulai implementasi, pastikan ini sudah dianggap final:

- [ ] SCADA adalah app terpisah penuh dari Angular
- [ ] MVP fokus monitoring only
- [ ] builder dan viewer sama-sama masuk fase pertama
- [ ] binding utama berada di level `sensor_channel`
- [ ] runtime memakai batch polling by `diagramId`
- [ ] save strategy memakai full diagram save
- [ ] route `view` dan `edit` dipisah
- [ ] state frontend dipisah menjadi diagram, runtime, dan UI
- [ ] schema inti memakai 4 tabel:
  - `scada_diagrams`
  - `scada_nodes`
  - `scada_edges`
  - `scada_node_bindings`

---

## 3. Checklist backend foundation

- [x] buat module SCADA baru di backend existing
- [x] buat entity `scada_diagrams`
- [x] buat entity `scada_nodes`
- [x] buat entity `scada_edges`
- [x] buat entity `scada_node_bindings`
- [x] buat migration tabel dan index
- [x] buat DTO create/list/detail/update/duplicate
- [x] buat `ScadaAccessService`
- [x] buat `ScadaMapperService`

Catatan implementasi 2026-03-16:

- module backend SCADA sudah ada di `iot-backend/src/modules/scada`
- schema 4 tabel inti sudah dibuat dan sudah diterapkan langsung ke production DB via DDL terpisah
- endpoint lookup `GET /api/scada/binding-options` juga sudah ditambahkan untuk kebutuhan editor

Selesai jika:

- diagram bisa disimpan dan dibaca dari DB dengan shape yang benar

---

## 4. Checklist diagram CRUD

- [x] implement `POST /api/scada/diagrams`
- [x] implement `GET /api/scada/diagrams`
- [x] implement `GET /api/scada/diagrams/:diagramId`
- [x] implement `PUT /api/scada/diagrams/:diagramId`
- [x] implement `DELETE /api/scada/diagrams/:diagramId`
- [x] pastikan full diagram save transactional
- [x] pastikan detail diagram mengembalikan node + edge + bindings
- [x] pastikan validasi payload dasar berjalan

Catatan implementasi 2026-03-16:

- duplicate endpoint `POST /api/scada/diagrams/:diagramId/duplicate` juga sudah tersedia
- validasi payload full save sudah mencakup id stabil, self-loop edge, ukuran node, dan duplicate binding scope
- `diagramCode` dijaga unik per owner
- not-found diagram pada backend sekarang sudah mengembalikan `404`

Selesai jika:

- create, load, update, archive diagram berjalan end-to-end

---

## 5. Checklist frontend foundation

- [x] setup app shell fullscreen
- [x] setup routing `view` dan `edit`
- [x] setup React Flow canvas
- [x] buat `useDiagramStore`
- [x] buat `useRuntimeStore`
- [x] buat `useUiStore`
- [x] render diagram payload ke canvas
- [ ] implement zoom, pan, fit view

Catatan implementasi 2026-03-16:

- app frontend React baru sudah dibootstrap di repo `iot-scada`
- shell fullscreen, route view/edit, dan canvas foundation sudah ada
- runtime polling hook dasar sudah ada
- build frontend awal sudah lulus

Selesai jika:

- diagram dari backend bisa tampil di canvas fullscreen

---

## 6. Checklist editor foundation

- [ ] implement toggle mode view/edit
- [x] implement node selection
- [x] implement edge selection
- [x] implement add node
- [x] implement connect edge
- [x] implement move node
- [x] implement delete node/edge
- [ ] implement dirty state
- [x] implement save button
- [ ] implement discard confirm
- [x] integrasikan full save/load

Catatan implementasi 2026-03-16:

- route view/edit sekarang sudah punya toggle via top bar
- editor foundation sudah mendukung selection, add node, connect edge, delete selection, drag node, dan save penuh ke backend
- dirty state dasar sudah berjalan untuk perubahan topology

Selesai jika:

- user bisa membuat dan menyimpan diagram secara manual

---

## 7. Checklist runtime foundation

- [x] implement `ScadaRuntimeService`
- [x] implement latest telemetry batch query
- [x] implement `GET /api/scada/diagrams/:diagramId/runtime`
- [ ] buat polling loop frontend
- [ ] map runtime response ke binding runtime state
- [ ] tampilkan latest value ke node
- [x] tampilkan status dasar:
  - `ok`
  - `off`
  - `offline`
  - `stale`
  - `unknown`

Catatan implementasi 2026-03-16:

- endpoint runtime backend sudah tersedia di `GET /api/scada/diagrams/:diagramId/runtime`
- status backend saat ini sudah mengembalikan `ok`, `warn`, `alert`, `off`, `stale`, `offline`, `unknown`
- backend runtime sudah memanfaatkan `value_engineered`, quality flag, dan threshold channel
- payload runtime backend juga sudah mengembalikan `rawValue`, `connectivityState`, `freshnessState`, dan `summary`

Selesai jika:

- diagram live dapat menampilkan data sensor realtime

---

## 8. Checklist widget visual

- [ ] buat shared node frame
- [ ] implement `pump`
- [ ] implement `valve`
- [ ] implement `flowmeter`
- [ ] implement `pressure`
- [ ] implement `reservoir`
- [ ] implement `junction`
- [ ] implement `intake`
- [ ] implement `wtp`
- [ ] implement `PipeEdge`
- [ ] implement warna `raw` dan `treated`
- [ ] implement animasi flow sederhana

Selesai jika:

- diagram terlihat seperti SCADA operasional, bukan graph editor generik

---

## 9. Checklist property panel

- [x] buat inspector context-sensitive
- [ ] implement form property node dasar
- [ ] implement form property edge
- [ ] implement binding editor
- [ ] implement threshold form dasar
- [ ] implement diagram settings panel

Selesai jika:

- user bisa mengedit properti dasar tanpa menyentuh JSON mentah

---

## 10. Checklist Angular integration

- [ ] tampilkan list SCADA di detail project Angular
- [ ] buat action open viewer
- [ ] buat action open editor
- [ ] validasi auth/session flow lintas frontend
- [ ] validasi access by project berjalan

Selesai jika:

- user bisa membuka SCADA dari Angular project detail

---

## 11. Checklist hardening

- [x] implement duplicate diagram
- [ ] rapikan error state load/save/runtime
- [ ] rapikan empty state
- [ ] cek rerender/runtime performance dasar
- [ ] cek UX saat network gagal
- [ ] cek UX saat diagram kosong

Selesai jika:

- sistem cukup stabil untuk demo internal

---

## 12. Checklist scope guard

Pastikan ini tidak ikut masuk diam-diam ke MVP:

- [ ] command/control device
- [ ] collaborative editing
- [ ] template system
- [ ] versioning penuh
- [ ] alarm workflow lengkap
- [ ] websocket runtime
- [ ] export PNG/PDF kompleks
- [ ] mobile edit penuh

---

## 13. Definition of done per milestone

### Milestone 1

- [x] DB schema selesai
- [x] diagram CRUD selesai
- [x] canvas foundation selesai
- [x] save/load selesai

### Milestone 2

- [x] runtime endpoint selesai
- [ ] polling frontend selesai
- [ ] node live value tampil
- [x] status dasar tampil

### Milestone 3

- [ ] widget visual dasar selesai
- [ ] property panel usable
- [ ] edit/view UX usable

### Milestone 4

- [ ] Angular integration selesai
- [ ] duplicate selesai
- [ ] error handling dasar rapi
- [ ] siap demo internal

---

## 14. Red flags saat eksekusi

Jika ini mulai terjadi, berarti implementasi mulai keluar jalur:

- [ ] frontend mulai memanggil telemetry per node
- [ ] runtime state dicampur ke saved diagram state
- [ ] backend SCADA mulai meniru widget-builder
- [ ] save tidak lagi full diagram tetapi granular setengah jadi
- [ ] styling detail dikerjakan sebelum save/runtime stabil
- [ ] Angular integration menghambat fondasi SCADA app

---

## 15. Checklist review sebelum mulai coding

- [ ] nama tabel dan entity final sudah diterima

---

## 16. Snapshot progres backend per 2026-03-16

- `npm run build` di `iot-backend` lulus
- suite test backend SCADA terisolasi lulus
- global test suite backend existing masih banyak yang gagal karena spec lama di module lain belum sehat
- frontend React SCADA dan Angular integration belum dikerjakan di thread ini
- [ ] route final sudah diterima
- [ ] API shape final sudah diterima
- [ ] status runtime baseline sudah diterima
- [ ] urutan implementasi sudah diterima

Jika lima poin ini sudah benar-benar disetujui, implementasi bisa dimulai tanpa risiko salah arah besar.
