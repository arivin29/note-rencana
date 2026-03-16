# SCADA Implementation Plan

> Document type: Delivery planning draft  
> Status: Draft for discussion  
> Scope: Rencana implementasi SCADA MVP dari fondasi sampai siap demo internal

---

## 1. Tujuan dokumen

Dokumen ini menerjemahkan hasil analisis dan technical draft menjadi urutan implementasi yang aman.

Fokusnya:

- urutan fase kerja
- dependency antar pekerjaan
- deliverable per fase
- risiko tiap fase
- batas MVP yang tetap terjaga

Dokumen ini belum membahas estimasi waktu yang terlalu kaku, tetapi memberi jalur pengerjaan yang realistis.

---

## 2. Prinsip implementasi

Prinsip yang direkomendasikan:

- kerjakan fondasi lebih dulu
- jangan mulai dari widget visual paling rumit
- validasi end-to-end flow secepat mungkin
- pisahkan `diagram persistence` dan `runtime flow`
- jangan menunda integrasi terlalu lama, tapi jangan menjadikannya blocker awal

---

## 3. Target implementasi MVP

MVP dianggap berhasil jika user dapat:

- membuat diagram SCADA
- menambah node dan edge
- mengedit properti dasar
- menyimpan diagram
- membuka diagram dalam mode view
- melihat data sensor realtime dalam diagram
- melihat status visual dasar node

---

## 4. Urutan implementasi yang direkomendasikan

Urutan besar yang saya rekomendasikan:

1. backend schema dan CRUD fondasi
2. frontend shell dan diagram editor foundation
3. full diagram save/load flow
4. runtime polling flow
5. widget/node visual dasar
6. edit/view UX refinement
7. duplicate diagram dan hardening

---

## 5. Fase 0: Preparation

### 5.1 Tujuan

Menyiapkan repo, struktur kerja, dan baseline type agar implementasi tidak liar.

### 5.2 Pekerjaan

- finalkan folder structure frontend
- finalkan module structure backend
- finalkan nama tabel dan entity SCADA
- finalkan DTO/type naming
- finalkan route naming

### 5.3 Deliverable

- struktur proyek siap
- technical decisions tidak lagi ambigu

### 5.4 Risiko

- mulai coding sebelum naming dan shape final -> revisi menyebar

---

## 6. Fase 1: Backend persistence foundation

### 6.1 Tujuan

Menyediakan persistence layer SCADA yang stabil.

### 6.2 Pekerjaan

- buat migration tabel SCADA
- buat entity/backend model SCADA
- buat diagram CRUD dasar
- buat mapper diagram detail
- buat access validation dasar

### 6.3 Endpoint target

- create diagram
- list diagram
- get diagram detail
- update full diagram
- archive diagram

### 6.4 Deliverable

- diagram bisa disimpan dan dimuat dari DB
- payload full diagram end-to-end sudah stabil

### 6.5 Risiko

- sync logic update diagram terlalu cepat dibuat rumit
- payload shape frontend dan backend belum selaras

---

## 7. Fase 2: Frontend canvas foundation

### 7.1 Tujuan

Membuat SCADA app bisa membuka diagram, menampilkan canvas, dan mengedit topology dasar.

### 7.2 Pekerjaan

- setup React app/module shell
- setup route `view` dan `edit`
- setup React Flow wrapper
- buat store diagram, runtime, dan UI
- render node placeholder
- render edge placeholder
- buat selection, pan, zoom, fit view

### 7.3 Deliverable

- page SCADA fullscreen jalan
- diagram dummy bisa dirender
- edit mode dan view mode sudah ada

### 7.4 Risiko

- terlalu cepat masuk styling detail
- mencampur state diagram dan runtime

---

## 8. Fase 3: Save/load end-to-end

### 8.1 Tujuan

Mengunci full diagram save sebagai fondasi editor.

### 8.2 Pekerjaan

- integrasikan `GET diagram detail`
- integrasikan `PUT full diagram`
- buat dirty state
- buat save button UX
- buat confirm discard changes
- buat add/delete node dan edge sederhana

### 8.3 Deliverable

- user bisa buat, edit, save, reload diagram

### 8.4 Risiko

- node ids lokal/frontend tidak sinkron dengan backend
- save flow belum transactional atau belum stabil

---

## 9. Fase 4: Runtime integration

### 9.1 Tujuan

Membuat diagram benar-benar hidup dengan data sensor existing.

### 9.2 Pekerjaan

- implement runtime endpoint by `diagramId`
- query latest telemetry batch
- map runtime response ke binding
- buat polling loop frontend
- render latest value ke node
- tampilkan state `offline/stale/ok/off/unknown` minimal

### 9.3 Deliverable

- viewer menampilkan data realtime pada diagram

### 9.4 Risiko

- query latest belum efisien
- runtime store memicu rerender berlebihan

---

## 10. Fase 5: Widget visual dasar

### 10.1 Tujuan

Mengganti placeholder node menjadi widget SCADA yang benar-benar representatif.

### 10.2 Pekerjaan

- implement 8 node type dasar
- buat pipe edge visual
- warna raw/treated
- animasi flow sederhana
- badge/status dot dasar

### 10.3 Deliverable

- diagram sudah terasa seperti SCADA, bukan graph editor biasa

### 10.4 Risiko

- terlalu cepat mengejar visual perfeksionis
- library widget jadi terlalu rumit sebelum runtime stabil

---

## 11. Fase 6: Property editing refinement

### 11.1 Tujuan

Membuat editing property nyaman dipakai.

### 11.2 Pekerjaan

- panel kanan context-sensitive
- editor binding
- threshold form dasar
- edge property form
- diagram settings form

### 11.3 Deliverable

- user bisa mengonfigurasi diagram tanpa edit JSON mentah

### 11.4 Risiko

- form terlalu generik
- terlalu banyak field sejak awal

---

## 12. Fase 7: Launch integration dari Angular

### 12.1 Tujuan

Menghubungkan Angular existing dengan SCADA app.

### 12.2 Pekerjaan

- tampilkan list SCADA pada detail project
- implement link open viewer/edit
- validasi auth flow antar frontend
- validasi access boundary project

### 12.3 Deliverable

- user bisa masuk SCADA dari Angular project detail

### 12.4 Risiko

- auth flow belum matang
- terlalu cepat mengikat SCADA ke shell Angular

---

## 13. Fase 8: Duplicate dan hardening

### 13.1 Tujuan

Menambah fitur yang penting untuk usability dan menutup celah bug utama.

### 13.2 Pekerjaan

- duplicate diagram
- delete/archive diagram
- improve error handling
- improve empty states
- improve permission feedback

### 13.3 Deliverable

- sistem lebih siap dipakai internal/demo

---

## 14. Dependency antar fase

Dependency yang harus dijaga:

- Fase 1 harus selesai sebelum save/load stabil
- Fase 2 harus selesai sebelum property panel dan widget visual
- Fase 3 harus stabil sebelum runtime integration
- Fase 4 harus stabil sebelum status visual kompleks
- Fase 7 tidak harus menunggu semua polishing selesai, tetapi auth boundary harus jelas

---

## 15. Prioritas teknis yang tidak boleh dibalik

Urutan ini jangan dibalik:

- jangan bikin widget visual lengkap sebelum save/load stabil
- jangan bikin auth integration rumit sebelum SCADA app sendiri hidup
- jangan bikin alarm logic berat sebelum runtime flow stabil
- jangan bikin template sebelum diagram editing dasar matang

---

## 16. Deliverable per milestone

### Milestone A

- backend CRUD diagram jalan
- frontend canvas foundation jalan
- diagram dummy bisa save/load

### Milestone B

- runtime polling jalan
- binding ke sensor_channel jalan
- node menunjukkan nilai live

### Milestone C

- 8 widget dasar usable
- edit/view UX usable
- launch dari Angular jalan

### Milestone D

- duplicate, archive, hardening selesai
- siap demo internal

---

## 17. Testing focus per fase

### Backend

- validasi payload diagram
- transaction save
- duplicate integrity
- runtime latest query
- permission check

### Frontend

- load/save behavior
- dirty state
- mode view/edit
- binding rendering
- runtime polling stability

### Integration

- open SCADA dari Angular
- session/auth validation
- access project yang benar

---

## 18. Risiko utama implementasi

Risiko yang paling perlu diawasi:

- save full diagram sinkronisasi child entity salah
- runtime polling membuat rerender berat
- node visual terlalu cepat jadi kompleks
- auth integration menghambat progres produk inti
- schema terlalu cepat dimasukkan fitur future

---

## 19. Scope guard

Hal yang harus ditahan agar MVP tidak melebar:

- jangan masuk command/control
- jangan masuk collaborative editing
- jangan masuk template engine
- jangan masuk versioning penuh
- jangan masuk alarm workflow penuh
- jangan masuk export/reporting kompleks

---

## 20. Rekomendasi implementasi awal paling aman

Kalau harus benar-benar pragmatis, urutan aman paling pendek adalah:

1. migration + entity SCADA
2. diagram CRUD + full save
3. React Flow canvas + save/load
4. runtime endpoint + polling
5. widget dasar + status visual
6. Angular launch integration

Ini sudah cukup untuk membuktikan produk.

---

## 21. Open questions

Masih bisa didiskusikan lebih lanjut:

- apakah duplicate masuk sebelum Angular integration atau sesudahnya
- apakah edge animation masuk sebelum semua widget selesai
- apakah mobile view minimal perlu diuji sejak milestone awal atau belakangan

---

## 22. Rekomendasi keputusan default

Baseline implementation plan yang direkomendasikan:

- mulai dari fondasi persistence dan full save
- lanjut ke canvas dan UX mode dasar
- baru masuk runtime polling
- baru masuk widget visual yang lebih representatif
- Angular integration dikerjakan setelah app SCADA sendiri stabil

Jika baseline ini diterima, maka fase diskusi pra-coding sudah cukup lengkap dan kita bisa memilih:

- review final semua dokumen
- atau mulai menurunkan ke task breakdown implementasi yang lebih operasional
