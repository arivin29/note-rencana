# SCADA Runtime Data Flow

> Document type: Pre-technical analysis  
> Status: Draft for discussion  
> Scope: Menentukan alur data runtime SCADA MVP sebelum desain API dan frontend state dirinci

---

## 1. Tujuan dokumen

Dokumen ini mendefinisikan bagaimana data live akan mengalir dari source existing ke viewer/editor SCADA.

Tujuan utamanya:

- memastikan runtime flow sederhana untuk MVP
- menjaga performa tetap aman saat diagram berisi banyak node
- mencegah coupling berlebihan ke model widget/report existing
- memisahkan saved diagram state dari live runtime state

Dokumen ini melanjutkan:

- [01-MVP-BOUNDARY-CHECKLIST.md](/Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/01-MVP-BOUNDARY-CHECKLIST.md)
- [02-DOMAIN-MODEL-SCADA.md](/Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/02-DOMAIN-MODEL-SCADA.md)

---

## 2. Prinsip runtime MVP

Prinsip yang direkomendasikan:

- polling batch, bukan request per node
- source of truth tetap data telemetry existing
- diagram topology tidak ikut berubah saat data live berubah
- runtime state hanya hidup di memory frontend untuk MVP
- editor dan viewer boleh berbagi engine runtime yang sama, tetapi viewer tetap prioritas

---

## 3. Source of truth runtime

### 3.1 Source utama

Untuk MVP, source runtime utama adalah:

- `sensor_channel`
- `sensor_type`
- nilai terbaru telemetry dari domain existing

Data historis tetap ada di `sensor_logs`, tetapi viewer SCADA tidak perlu membaca histori penuh pada tiap refresh normal.

### 3.2 Nilai yang dipakai viewer

Viewer SCADA idealnya memakai nilai yang paling siap tampil:

- prioritas utama: `value_engineered`
- fallback bila perlu: `value_raw`

Rekomendasi default:

- SCADA MVP menampilkan `value_engineered`
- `conversion_formula` dari `sensor_types` hanya diperlakukan sebagai metadata referensi

Alasan:

- menghindari duplikasi kalkulasi di frontend
- menjaga konsistensi dengan pipeline telemetry existing

---

## 4. Alur runtime level tinggi

Alur yang direkomendasikan untuk satu diagram:

1. frontend load diagram SCADA
2. frontend menerima daftar node, edge, dan bindings
3. frontend mengumpulkan seluruh `id_sensor_channel` aktif pada diagram
4. frontend melakukan satu request batch ke backend runtime SCADA
5. backend mengambil latest value untuk semua channel yang diminta
6. backend mengembalikan response runtime per channel
7. frontend memetakan response ke `binding_key` pada tiap node
8. frontend menghitung presentation state node
9. viewer merender angka, warna, badge, dan animasi flow

---

## 5. Kenapa batch polling wajib

Jika satu diagram punya 30 sampai 80 node dan setiap node punya beberapa binding, pola request per node akan cepat menjadi masalah.

Masalah yang akan muncul:

- terlalu banyak HTTP request
- beban backend meningkat
- UI terasa lambat dan tidak sinkron
- data antar node datang pada waktu berbeda

Karena itu, rekomendasi runtime MVP tetap:

- satu diagram
- satu polling timer
- satu batch request
- satu mapping response

---

## 6. Siapa yang mengumpulkan binding aktif

Ada dua opsi:

### Opsi A: frontend mengumpulkan binding

Frontend:

- membaca semua binding dari payload diagram
- membuat daftar unik `id_sensor_channel`
- mengirim daftar itu ke backend runtime

Kelebihan:

- sederhana
- cocok untuk MVP
- frontend sudah punya topology lengkap

Kekurangan:

- logika mapping lebih banyak di frontend

### Opsi B: backend menghitung binding dari `diagramId`

Frontend:

- hanya mengirim `diagramId`

Backend:

- membaca binding diagram dari database
- menyusun daftar channel sendiri
- mengembalikan runtime payload

Kelebihan:

- frontend lebih tipis
- kontrol backend lebih kuat

Kekurangan:

- service runtime backend sedikit lebih kompleks

### Rekomendasi default

Untuk MVP, saya sarankan:

- frontend kirim `diagramId`
- backend runtime yang menghitung binding aktif

Alasan:

- mencegah frontend mengirim daftar binding yang bisa salah atau stale
- lebih aman kalau nanti ada permission/filtering tambahan
- lebih cocok untuk evolusi jangka panjang

Namun jika ingin mempercepat implementasi awal, frontend mengirim daftar `sensor_channel_id` juga masih bisa diterima selama kontraknya jelas.

---

## 7. Bentuk endpoint runtime yang direkomendasikan

Untuk MVP, lebih baik tidak memakai endpoint generik report/query.

Lebih baik ada endpoint SCADA-aware seperti:

- `GET /api/scada/diagrams/:id/runtime`

atau

- `POST /api/scada/runtime/batch`

### 7.1 Opsi paling pragmatis untuk MVP

`GET /api/scada/diagrams/:id/runtime`

Backend akan:

- validasi akses user ke diagram
- ambil semua binding aktif dari diagram
- ambil latest value untuk semua channel terkait
- kembalikan runtime payload yang siap dipakai frontend

### 7.2 Kenapa ini lebih baik dari endpoint generic sensor batch

- diagram context sudah jelas
- backend bisa ikut kirim metadata binding
- lebih aman untuk auth dan permission
- lebih mudah tambah status `stale`, `offline`, atau `quality`

---

## 8. Bentuk response runtime yang direkomendasikan

Response runtime sebaiknya bukan sekadar map `channel_id -> number`.

Minimal perlu:

- `channelId`
- `value`
- `rawValue`
- `timestamp`
- `qualityFlag`
- `unit`
- `precision`
- `category`
- `sensorTypeId`

Idealnya backend juga boleh mengembalikan hasil yang sudah dekat ke kebutuhan UI:

- `isStale`
- `isOffline`

### 8.1 Bentuk konseptual response

Bagian `bindings`

- keyed by `scada_node_binding.id` atau `channelId`

Bagian `meta`

- `polledAt`
- `diagramId`
- `intervalMs`

Bagian `nodeState` opsional untuk fase lanjut

- status node hasil komputasi backend

### 8.2 Rekomendasi default untuk MVP

Backend cukup mengembalikan runtime per binding/channel.

Frontend yang melakukan:

- mapping ke node
- komputasi status presentasi ringan

---

## 9. Latest value strategy

Ini keputusan penting.

SCADA viewer normalnya tidak butuh scan histori besar setiap 5 detik. Karena itu perlu strategi `latest value`.

### 9.1 Opsi yang mungkin

- query langsung ke `sensor_logs` untuk ambil data terbaru per channel
- punya materialized/latest table khusus
- punya service cache/memory layer

### 9.2 Rekomendasi default MVP

MVP boleh mulai dengan:

- query latest from `sensor_logs`

Syarat:

- query harus batch
- index pada `id_sensor_channel, ts` dipakai optimal

### 9.3 Catatan scale

Jika diagram makin banyak dan concurrency naik, langkah evolusi berikutnya bisa:

- buat table latest telemetry
- atau cache runtime khusus

Tapi itu belum wajib untuk MVP.

---

## 10. Runtime state di frontend

Frontend tidak boleh mencampur saved diagram config dengan nilai live.

### 10.1 Saved state

Saved state berisi:

- node
- edge
- binding config
- style
- property diagram

Ini hanya berubah saat user edit dan save.

### 10.2 Runtime state

Runtime state berisi:

- latest value per binding
- timestamp update terakhir
- stale/offline flags
- presentation status node
- loading/error state polling

Ini berubah terus saat polling berjalan.

### 10.3 Kenapa harus dipisah

Kalau runtime state dimasukkan ke model node yang disimpan:

- editor sulit dipelihara
- diff save jadi kotor
- undo/redo jadi rumit
- bug UI lebih mudah muncul

Rekomendasi:

- saved diagram state di store diagram
- runtime state di store runtime terpisah

---

## 11. Viewer dan editor terhadap runtime

### 11.1 Viewer

Viewer selalu boleh menyalakan runtime polling.

### 11.2 Editor

Editor punya dua opsi:

- tetap polling agar builder bisa melihat efek live
- matikan polling saat mode edit jika ingin lebih ringan

### 11.3 Rekomendasi default

Karena konsep yang dipilih adalah satu halaman dengan toggle edit:

- runtime tetap aktif di page yang sama
- saat mode edit, polling boleh tetap berjalan
- tetapi interaksi edit tidak boleh terganggu oleh refresh runtime

Artinya:

- runtime hanya mengubah tampilan live
- runtime tidak mengubah posisi, koneksi, atau config node

---

## 12. Stale, offline, warn, alert

Status ini belum dikunci final, tetapi runtime flow harus memberi ruang untuknya.

### 12.1 Yang harus sudah didukung arsitektur

- deteksi data terlambat (`stale`)
- deteksi node/device offline
- deteksi kualitas data jelek
- deteksi threshold warning/alert nanti

### 12.2 Rekomendasi default untuk MVP arsitektur

Response runtime sebaiknya minimal punya:

- timestamp value terakhir
- quality flag
- reference ke node/sensor/channel

Dengan itu, frontend bisa menghitung:

- data masih segar atau tidak
- apakah channel layak ditampilkan

Definisi bisnis final untuk warna status bisa dibahas pada dokumen khusus berikutnya.

---

## 13. Peran `sensor_types` saat runtime

Saat runtime, metadata `sensor_types` dipakai untuk:

- menentukan unit default
- menentukan precision default
- membantu klasifikasi metric
- membantu default rendering widget tertentu

Contoh:

- channel pressure akan lebih natural dirender ke widget pressure
- channel flow akan lebih natural dirender ke flowmeter
- precision default mencegah angka tampil terlalu berisik

### 13.1 Apa yang tidak perlu dilakukan di MVP

- evaluasi `conversion_formula` di frontend
- inferensi otomatis kompleks berdasarkan formula

MVP cukup memakai metadata `category`, `default_unit`, dan `precision`.

---

## 14. Error handling runtime

Runtime flow harus menangani minimal tiga jenis error:

- gagal load diagram
- gagal polling runtime
- runtime partial success

### 14.1 Partial success

Jika sebagian channel berhasil dan sebagian gagal:

- viewer tetap tampil
- node terkait diberi indikasi data unavailable
- seluruh diagram tidak boleh blank total

### 14.2 Retry behavior

Rekomendasi default:

- retry otomatis pada siklus polling berikutnya
- sediakan refresh manual

---

## 15. Performa MVP yang perlu dijaga

Target dasar yang realistis:

- satu diagram polling tiap 5 detik
- puluhan binding masih aman
- render node tidak memicu redraw seluruh canvas secara berlebihan

### 15.1 Hal yang harus dihindari

- request per node
- request per binding
- fetch histori penuh untuk viewer normal
- menyimpan runtime state ke database pada setiap polling

---

## 16. Open questions

Topik berikut masih perlu dibahas lanjut:

- apakah backend runtime response dikunci per channel atau per binding
- apakah kita butuh endpoint latest-value khusus di luar SCADA module
- kapan perlu latest table khusus
- bagaimana definisi final `stale` dan `offline`
- apakah edge animation cukup berdasarkan config atau perlu mengikuti nilai flow sungguhan
- apakah editor tetap live polling penuh atau lebih hemat saat edit mode

---

## 17. Rekomendasi keputusan default

Baseline yang direkomendasikan untuk MVP:

- runtime memakai batch polling
- interval default 5000 ms
- backend menyediakan endpoint runtime khusus SCADA
- backend membaca binding aktif berdasarkan `diagramId`
- backend mengembalikan latest runtime value plus metadata penting
- frontend memisahkan saved state dan runtime state
- frontend menghitung presentation state ringan
- `value_engineered` menjadi nilai utama yang ditampilkan
- `sensor_types` dipakai sebagai metadata unit, precision, dan kategori

Jika baseline ini diterima, langkah berikutnya paling tepat adalah:

`04-AUTH-INTEGRATION-BLUEPRINT.md`

Fokusnya:

- hubungan Angular dan SCADA app
- auth antar frontend
- launch flow
- ownership boundary
- deployment boundary
