# SCADA Save Strategy

> Document type: Pre-technical analysis  
> Status: Draft for discussion  
> Scope: Menentukan strategi penyimpanan perubahan diagram SCADA untuk MVP

---

## 1. Tujuan dokumen

Dokumen ini menentukan bagaimana editor SCADA menyimpan perubahan diagram.

Keputusan ini penting karena akan memengaruhi:

- arsitektur state frontend
- bentuk API contract
- pola write ke database
- risiko conflict dan data corruption
- kemudahan implementasi MVP

---

## 2. Pertanyaan inti

Ada dua model utama:

- `full diagram save`
- `granular save`

Dokumen ini membahas tradeoff keduanya dan memberikan rekomendasi untuk MVP.

---

## 3. Opsi A: Full diagram save

### 3.1 Definisi

Saat user menekan `Save`, frontend mengirim satu payload diagram lengkap:

- metadata diagram
- seluruh node
- seluruh edge
- seluruh binding
- seluruh config visual yang relevan

Backend lalu menyelaraskan isi database dengan payload tersebut.

### 3.2 Kelebihan

- paling sederhana untuk dipahami
- cocok dengan model editor berbasis canvas
- frontend lebih mudah dikelola
- tidak perlu banyak endpoint granular
- satu tombol save bisa mencerminkan satu snapshot utuh diagram

### 3.3 Kekurangan

- payload lebih besar
- backend harus punya logic sinkronisasi create/update/delete
- kalau tidak hati-hati, risk overwrite lebih tinggi

### 3.4 Kapan model ini cocok

- MVP
- single-user editing
- belum ada collaborative editing
- autosave belum dipakai

---

## 4. Opsi B: Granular save

### 4.1 Definisi

Frontend mengirim perubahan per bagian:

- create node
- update node position
- delete node
- create edge
- update edge
- update bindings
- update diagram settings

### 4.2 Kelebihan

- payload kecil
- update bisa lebih spesifik
- cocok jika nanti ada autosave atau collaborative editing

### 4.3 Kekurangan

- jumlah endpoint bertambah
- state frontend lebih rumit
- urutan update bisa menjadi sumber bug
- backend lebih mudah terjebak partial inconsistency

### 4.4 Kapan model ini cocok

- fase lanjutan
- collaborative editing
- autosave halus
- audit perubahan granular

---

## 5. Konteks keputusan untuk proyek ini

Keadaan proyek saat ini:

- MVP
- belum ada collaborative editing
- autosave tidak dibutuhkan
- builder dan viewer fokus selesai dulu
- domain topology masih baru dan perlu implementasi yang stabil

Dengan kondisi ini, keputusan save harus mengutamakan:

- kesederhanaan
- konsistensi
- kemudahan pengembangan

---

## 6. Rekomendasi utama untuk MVP

Rekomendasi saya:

- gunakan `full diagram save` untuk MVP

### 6.1 Alasan

- paling cocok dengan nature canvas editor
- lebih aman untuk implementasi awal
- lebih sedikit endpoint
- lebih mudah dijaga konsistensinya
- memudahkan duplicate diagram, import/export, dan snapshot mental model

### 6.2 Dampak positif

Frontend:

- cukup punya satu representasi diagram in-memory
- tombol save lebih jelas
- dirty state lebih mudah dihitung

Backend:

- cukup punya satu endpoint utama update diagram
- bisa menyelaraskan seluruh topology dalam satu transaction

Database:

- perubahan node/edge/binding bisa diproses sebagai satu unit kerja

---

## 7. Bentuk save flow yang direkomendasikan

Alur save yang direkomendasikan:

1. user edit diagram di frontend
2. semua perubahan tersimpan di state editor lokal
3. user menekan `Save`
4. frontend menyusun payload diagram lengkap
5. backend validasi payload
6. backend menyimpan perubahan diagram dalam satu transaction
7. backend mengembalikan diagram final yang telah disimpan

---

## 8. Transaction boundary di backend

Kalau memakai full diagram save, backend harus memperlakukan penyimpanan diagram sebagai satu transaction.

### 8.1 Yang ideal terjadi dalam satu transaction

- update metadata diagram
- sinkronisasi node
- sinkronisasi edge
- sinkronisasi binding
- validasi foreign reference penting

### 8.2 Kenapa ini penting

Tanpa transaction, risiko yang bisa terjadi:

- node tersimpan tapi edge gagal
- edge tersimpan tapi binding belum sinkron
- diagram jadi setengah jadi

---

## 9. Pola sinkronisasi yang direkomendasikan

Backend perlu membandingkan:

- data existing di DB
- payload baru dari frontend

Lalu memetakan:

- item baru -> create
- item lama yang berubah -> update
- item lama yang hilang dari payload -> soft delete atau delete

### 9.1 Untuk MVP

Pendekatan yang paling pragmatis:

- diagram update
- sync nodes
- sync edges
- sync bindings

Urutan ideal:

1. update diagram
2. sync nodes
3. sync edges
4. sync bindings

Kenapa binding terakhir:

- binding tergantung node yang valid

---

## 10. Soft delete vs delete saat save

Saat frontend menghapus node atau edge, backend perlu memutuskan apakah:

- hard delete
- soft delete

### 10.1 Rekomendasi MVP

Untuk `nodes`, `edges`, dan `bindings` di dalam operasi save:

- hard delete masih bisa diterima untuk item yang benar-benar dihapus dalam diagram draft aktif

Untuk `diagram`:

- lebih baik pakai `is_active` atau `status`

### 10.2 Catatan

Kalau nanti versioning masuk, strategi ini bisa berubah.

---

## 11. Dirty state di frontend

Dengan full diagram save, frontend perlu state sederhana:

- `savedDiagram`
- `workingDiagram`
- `isDirty`

### 11.1 Rekomendasi

- `workingDiagram` berubah saat user edit
- `savedDiagram` di-update setelah save sukses
- `isDirty` dihitung dari perubahan antara keduanya atau lewat mutation flag

### 11.2 Kenapa ini cocok

- mudah dipahami
- cocok untuk tombol save manual
- cocok untuk warning saat user mau keluar page

---

## 12. Tombol save dan UX

Karena autosave tidak dipakai, UX save harus jelas.

### 12.1 Rekomendasi dasar

- tampilkan tombol `Save`
- tampilkan status `Unsaved changes`
- tampilkan `Saving...` saat request berjalan
- tampilkan hasil sukses/gagal dengan jelas

### 12.2 Yang sebaiknya tidak dilakukan di MVP

- autosave diam-diam
- save parsial yang tidak jelas ke user

---

## 13. Duplicate diagram dan save strategy

Full diagram save juga lebih cocok dengan duplicate diagram.

Karena saat duplicate:

- frontend atau backend cukup membuat salinan topology penuh
- hasilnya bisa diperlakukan sebagai diagram baru utuh

Ini lebih alami daripada model granular yang harus menciptakan node, edge, dan binding satu per satu lewat banyak API call.

---

## 14. Import/export readiness

Walau import/export belum masuk MVP, full diagram save memberi keuntungan:

- format payload save bisa lebih dekat ke format export/import
- lebih mudah membuat backup atau clone diagram nanti

Ini nilai tambah untuk jangka panjang.

---

## 15. Risiko full diagram save yang perlu diantisipasi

Risiko utamanya:

- overwrite perubahan jika suatu saat multi-user edit terjadi
- payload besar bila diagram sangat kompleks
- backend sync logic harus rapi

### 15.1 Mitigasi untuk MVP

- anggap single-editor per diagram
- belum perlu conflict resolution kompleks
- batasi scope diagram MVP agar tidak terlalu besar
- pastikan save dilakukan dalam transaction

---

## 16. Kapan perlu pindah ke granular save

Granular save baru layak dipertimbangkan bila:

- autosave dibutuhkan
- collaborative editing dibutuhkan
- audit perubahan per komponen dibutuhkan
- diagram menjadi sangat besar dan update full jadi berat

Untuk saat ini itu belum perlu.

---

## 17. Rekomendasi API level

Untuk MVP, endpoint save utama sebaiknya cukup seperti:

- `POST /api/scada/diagrams`
- `GET /api/scada/diagrams/:id`
- `PUT /api/scada/diagrams/:id`
- `POST /api/scada/diagrams/:id/duplicate`

### 17.1 Khusus update diagram

`PUT /api/scada/diagrams/:id`

Payload:

- diagram metadata
- nodes[]
- edges[]
- bindings[]

Backend:

- validasi
- transaction save
- return normalized diagram payload

---

## 18. Open questions

Hal yang masih perlu diputuskan di technical design:

- apakah payload save mengandung bindings nested di node atau sebagai list terpisah
- apakah delete item dilakukan hard delete atau is_active false
- apakah duplicate diagram dilakukan full di backend
- apakah save harus memvalidasi semua `sensor_channel` masih valid saat itu

---

## 19. Rekomendasi keputusan default

Baseline yang direkomendasikan:

- MVP menggunakan `full diagram save`
- save hanya terjadi saat user menekan tombol save
- backend menyimpan diagram dalam satu transaction
- frontend menjaga `working diagram state` terpisah dari `saved state`
- granular save ditunda ke fase berikutnya bila memang dibutuhkan

Jika baseline ini diterima, topik berikut yang paling tepat dibahas adalah:

- model status runtime: `offline`, `warn`, `alert`, `off`
- atau UX final mode view/edit
