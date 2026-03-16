# SCADA MVP Boundary Checklist

> Document type: Pre-technical analysis  
> Status: Draft for discussion  
> Scope: Menentukan batas MVP SCADA sebelum menyusun dokumen teknis

---

## 1. Tujuan dokumen

Dokumen ini dipakai untuk mengunci boundary produk SCADA MVP agar:

- scope tidak melebar di tengah implementasi
- keputusan arsitektur tidak salah arah
- domain SCADA tidak bentrok dengan dashboard/report builder existing
- frontend, backend, dan database bisa dirancang sederhana tetapi tetap mudah dikembangkan

Dokumen ini belum masuk detail teknis implementasi. Fokusnya adalah keputusan produk dan sistem level tinggi.

---

## 2. Definisi singkat produk

SCADA yang akan dibangun adalah modul web terpisah untuk:

- membuat diagram proses operasional secara visual
- menampilkan kondisi sensor realtime dalam konteks flow sistem
- memudahkan operator memahami status sistem melalui representasi proses, bukan hanya angka atau grafik

SCADA ini berbeda dari widget builder/reporting yang sudah ada.

- Widget builder: query-driven, chart/report oriented
- SCADA: topology-driven, asset/flow oriented, operational monitoring

---

## 3. Boundary MVP yang direkomendasikan

### 3.1 Fokus utama MVP

MVP harus fokus pada:

- visual builder untuk diagram SCADA
- live viewer untuk monitoring realtime
- binding node diagram ke data sensor existing
- save/load diagram

MVP tidak perlu mengejar semua kebutuhan SCADA industri penuh.

### 3.2 Nilai utama MVP

User harus bisa:

- membuat diagram proses air dengan cepat
- menghubungkan aset operasional dalam satu tampilan flow
- melihat status realtime per titik proses
- memahami kondisi sistem tanpa membuka banyak tabel atau dashboard chart

### 3.3 Non-goal MVP

Fitur berikut direkomendasikan di luar MVP:

- remote control device atau command ke lapangan
- collaborative editing realtime
- advanced versioning yang kompleks
- histori alarm lengkap
- reporting/export kompleks
- custom scripting antar node
- routing pipa cerdas tingkat lanjut
- permissions sangat detail per komponen diagram

---

## 4. Keputusan boundary yang harus dikunci

Bagian ini adalah checklist keputusan sebelum dokumen teknis dibuat.

### 4.1 Monitoring only vs control

Keputusan:

- Apakah SCADA MVP hanya untuk monitoring?
- Apakah user boleh mengirim command ke pompa/valve?

Rekomendasi default:

- MVP = monitoring only

Alasan:

- jauh lebih aman
- tidak mengganggu sistem existing
- mengurangi kompleksitas audit, security, dan fail-safe behavior

### 4.2 Editor dan viewer

Keputusan:

- Apakah builder dan viewer sama-sama masuk MVP?
- Apakah viewer readonly?

Rekomendasi default:

- Ya, builder dan viewer masuk MVP
- Viewer harus readonly
- Editor dan viewer dipisah jelas sebagai mode berbeda

Alasan:

- builder dibutuhkan untuk membuat diagram
- viewer dibutuhkan untuk operasional
- pemisahan mode akan menjaga state lebih bersih

### 4.3 Target user awal

Keputusan:

- siapa user utama di fase pertama

Rekomendasi default:

- primary user: engineer/admin untuk membuat diagram
- primary runtime user: operator/supervisor untuk melihat diagram

Implikasi:

- UX editor dan UX viewer tidak boleh diasumsikan sama

### 4.4 Level ownership diagram

Keputusan:

- diagram dimiliki oleh owner, project, site, atau plant

Rekomendasi default:

- diagram diikat minimal ke `project`
- owner tetap implicit melalui project

Alasan:

- model existing backend memang project-centric
- paling mudah sinkron dengan struktur data sekarang

### 4.5 Binding level

Keputusan:

- node SCADA bind ke `node`, `sensor`, atau `sensor_channel`

Rekomendasi default:

- binding runtime utama ke `sensor_channel`
- optional reference tambahan ke `node` atau `sensor` untuk context

Alasan:

- nilai telemetry nyata paling spesifik ada di channel
- threshold dan metadata pengukuran juga dekat ke channel

### 4.6 Realtime strategy

Keputusan:

- polling atau websocket
- per widget atau batch

Rekomendasi default:

- MVP = batch polling
- interval default 5000ms
- satu diagram melakukan satu request batch untuk seluruh binding aktif

Alasan:

- paling sederhana dan cukup untuk MVP
- sesuai constraint existing system
- mencegah request explosion

### 4.7 Save model

Keputusan:

- diagram disimpan sebagai satu blob JSON atau split entity

Rekomendasi default:

- persistence model hybrid
- diagram, node, edge sebagai entity inti
- config visual dan binding spesifik disimpan fleksibel dalam JSONB

Alasan:

- relasi topology tetap eksplisit
- konfigurasi widget tetap mudah berkembang

### 4.8 Draft vs published

Keputusan:

- apakah viewer membaca draft atau published version

Rekomendasi default:

- MVP awal boleh tanpa workflow publish kompleks
- tetapi schema dan arsitektur harus memberi ruang untuk `draft` dan `published` di fase berikut

Alasan:

- jangan memberatkan MVP
- jangan menutup jalan untuk production workflow

### 4.9 Angular integration boundary

Keputusan:

- apakah SCADA embed ke Angular atau app terpisah penuh

Rekomendasi default:

- SCADA adalah app terpisah penuh
- Angular hanya menangani list, entry point, dan administrasi ringan jika perlu

Alasan:

- SCADA bersifat fullscreen operational app
- mengurangi risiko mengganggu Angular existing

---

## 5. Fitur MVP yang direkomendasikan

### 5.1 Diagram management

- list diagram
- create diagram
- rename diagram
- delete/archive diagram
- open viewer
- open editor

### 5.2 Builder / editor

- free canvas
- drag and drop widget dasar
- connect antar node dengan edge/pipa
- move/select/delete/duplicate node
- property panel untuk edit konfigurasi
- zoom, pan, fit-to-screen
- save dan load diagram

### 5.3 Viewer / live monitoring

- readonly fullscreen viewer
- load diagram sesuai project
- batch polling realtime
- status visual per node
- animasi flow sederhana pada edge
- indikator offline/stale data
- refresh manual dan auto refresh

### 5.4 Widget dasar MVP

- Intake
- Pump
- Valve
- Flow Meter
- Pressure
- Reservoir
- WTP
- Junction

### 5.5 Property panel dasar

- label
- sensor binding
- unit
- threshold
- pipe type
- flow direction
- color/state options tertentu yang relevan

---

## 6. Fitur yang sebaiknya ditunda

Fitur berikut sebaiknya tidak masuk fase awal:

- command/control device
- multi-user live collaboration
- comment/annotation kompleks
- export PDF/PNG jika mengganggu core flow
- advanced pipe auto-routing
- historian playback
- dashboard analytic overlay yang berat
- alarm acknowledgement workflow penuh
- reusable component marketplace

---

## 7. Risiko jika boundary tidak dikunci

Jika boundary MVP tidak jelas, risiko paling besar adalah:

- SCADA berubah menjadi dashboard builder kedua
- frontend mencampur editor state dan runtime state
- backend terpaksa mengikuti model query/widget yang tidak cocok
- diagram menjadi sulit berkembang saat kebutuhan multi-binding muncul
- performa runtime buruk karena request per node/widget
- integrasi auth menjadi afterthought dan mahal diperbaiki

---

## 8. Prinsip desain MVP

Prinsip yang direkomendasikan:

- sederhana dulu, tetapi jangan mengunci masa depan
- topology adalah pusat model, bukan query
- runtime live state dipisah dari persisted diagram state
- editor dipisah dari viewer
- integrasi ke Angular seminimal mungkin
- gunakan data telemetry existing sebagai source of truth
- jangan ubah domain telemetry existing kalau tidak perlu

---

## 9. Pertanyaan yang harus dijawab dalam diskusi berikutnya

### Product

- Apakah MVP benar-benar monitoring only?  
  Jawaban saat ini: ya, monitoring only. Kontrol device bukan bagian MVP dan dipertimbangkan untuk tahap berikutnya.
- Apakah builder dan viewer keduanya harus siap di fase pertama?  
  Jawaban saat ini: ya, keduanya masuk fase pertama.
- Apakah satu diagram selalu terkait satu project?  
  Jawaban saat ini: tidak harus selalu kaku. Diagram tetap harus bisa dikaitkan ke owner/project, tetapi relasi project dapat diperlakukan sebagai atribut bisnis, bukan pembatas mutlak semua skenario.

### Runtime

- Binding node akan menggunakan `sensor_channel` secara penuh?  
  Jawaban saat ini: ya.
- Bagaimana status `offline`, `warn`, `alert`, dan `off` didefinisikan?  
  Jawaban saat ini: belum dikunci, dibahas terpisah nanti.
- Apakah alarm visual cukup dihitung di frontend pada MVP?  
  Jawaban saat ini: alarm visual bukan fokus MVP, dibahas pada tahap dua.

### UX

- Apakah viewer hanya fullscreen tanpa layout admin sama sekali?  
  Jawaban saat ini: ya, fullscreen penuh.
- Apakah editor butuh sidebar kiri dan property panel kanan sejak awal?  
  Jawaban saat ini: konsep yang diinginkan lebih dekat ke satu halaman seperti Grafana, dengan toggle edit kecil. Saat mode edit aktif, tampil menu edit/palette kecil di kiri dan drawer/component edit terpisah saat menambah atau mengubah widget.
- Apakah ada kebutuhan mobile, atau hanya desktop/tablet layar besar?  
  Jawaban saat ini: desktop adalah prioritas, tetapi mobile view tetap perlu dipikirkan untuk fase berikut.

### Persistence

- Apakah perlu autosave?  
  Jawaban saat ini: tidak.
- Apakah perlu duplicate diagram?  
  Jawaban saat ini: mungkin perlu, jadi sebaiknya ruangnya disiapkan.
- Apakah perlu template diagram pada MVP atau sesudah MVP?  
  Jawaban saat ini: template diabaikan dulu sampai sistem stabil.

### Integration

- Bagaimana launch flow dari Angular ke SCADA?  
  Jawaban saat ini: dari halaman detail project di Angular akan ditampilkan list SCADA. Artinya SCADA tersedia dalam konteks owner dan project, lalu dibuka lewat link ke app SCADA terpisah.
- Model auth lintas frontend yang paling realistis untuk fase awal apa?  
  Jawaban saat ini: fase awal menggunakan link dari Angular sebagai pintu masuk, sementara mekanisme auth lintas frontend dirancang sesederhana mungkin tanpa mengganggu Angular existing.

---

## 10. Output yang diharapkan setelah checklist ini selesai

Jika checklist boundary ini sudah dikunci, maka langkah berikutnya bisa masuk ke:

1. domain model SCADA
2. runtime data flow SCADA
3. auth dan integration blueprint
4. database strategy
5. technical design document

---

## 11. Keputusan yang sudah dikunci saat ini

- SCADA MVP adalah monitoring only
- kontrol device tidak masuk MVP
- builder dan viewer sama-sama harus tersedia di fase pertama
- viewer adalah fullscreen operational screen
- SCADA app terpisah penuh dari Angular admin
- Angular akan menampilkan list SCADA di context detail project
- binding utama berada di level `sensor_channel`
- autosave tidak diperlukan
- template diagram ditunda
- duplicate diagram mungkin diperlukan, tetapi tidak wajib masuk hari pertama
- detail status runtime dan alarm visual dibahas pada sesi berikutnya

---

## 12. Rekomendasi keputusan default untuk sekarang

Agar diskusi bisa bergerak cepat, berikut baseline yang saya rekomendasikan:

- SCADA MVP adalah monitoring only
- SCADA app terpisah penuh dari Angular
- Angular hanya menjadi launcher/list/admin ringan
- diagram harus bisa dikaitkan ke owner/project, tetapi relasi project tidak perlu diasumsikan kaku dalam semua skenario
- binding utama berada di level `sensor_channel`
- runtime memakai batch polling default 5 detik
- editor dan viewer dipisah secara mode, tetapi tetap bisa berada dalam satu halaman aplikasi dengan toggle edit
- MVP fokus ke builder, viewer, save/load, dan live status
- alarm visual detail belum menjadi fokus MVP
- command/control ditunda

Dokumen teknis berikutnya sebaiknya menganggap baseline di atas benar, kecuali ada keputusan diskusi yang mengubahnya.
