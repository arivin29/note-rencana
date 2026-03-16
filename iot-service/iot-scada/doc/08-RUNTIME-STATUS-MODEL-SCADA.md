# SCADA Runtime Status Model

> Document type: Pre-technical analysis  
> Status: Draft for discussion  
> Scope: Menentukan model status visual dan runtime state node SCADA untuk MVP

---

## 1. Tujuan dokumen

Dokumen ini mendefinisikan bagaimana SCADA menentukan status visual komponen saat runtime.

Tujuannya:

- membuat status node konsisten
- memberi dasar yang jelas untuk warna dan indikator viewer
- memisahkan status konektivitas, status data, dan status operasional
- menghindari kebingungan saat satu node punya banyak binding

---

## 2. Kenapa status model penting

Tanpa model status yang jelas, node SCADA akan cepat membingungkan:

- kapan warna merah muncul
- kapan node dianggap mati
- apakah tidak ada data berarti offline
- apakah pompa off itu error atau kondisi normal

Karena itu status runtime harus dibedakan secara eksplisit.

---

## 3. Jenis status yang perlu dibedakan

Untuk SCADA, ada tiga lapisan status yang sebenarnya berbeda:

- `connectivity state`
- `data freshness / quality state`
- `operational / threshold state`

Viewer akhir bisa mereduksi ketiganya menjadi status visual sederhana, tetapi model internalnya jangan dicampur.

---

## 4. Status visual akhir yang direkomendasikan

Untuk MVP, status visual akhir node direkomendasikan:

- `ok`
- `warn`
- `alert`
- `off`
- `offline`
- `stale`
- `unknown`

### 4.1 Definisi ringkas

`ok`

- data valid
- kondisi operasional normal

`warn`

- data valid
- mendekati batas atau berada di kondisi waspada

`alert`

- data valid
- melewati batas kritis atau fault condition aktif

`off`

- komponen sengaja tidak aktif atau state normal non-running

`offline`

- device/sumber data tidak terhubung

`stale`

- data terakhir terlalu lama, tetapi belum bisa dipastikan offline mutlak

`unknown`

- belum ada cukup data untuk menyimpulkan

---

## 5. Status yang masuk MVP vs ditunda

### 5.1 Yang harus didukung arsitektur MVP

- `ok`
- `off`
- `offline`
- `stale`
- `unknown`

### 5.2 Yang sebaiknya disiapkan tetapi aturan bisnisnya bisa sederhana dulu

- `warn`
- `alert`

Alasan:

- warning dan alert akan bergantung pada threshold dan rule bisnis yang mungkin belum final
- tetapi arsitektur dan color system tetap harus sudah punya slot untuk keduanya

---

## 6. Sumber penentuan status

Status node seharusnya tidak berasal dari satu sumber tunggal saja.

### 6.1 Connectivity source

Connectivity bisa berasal dari:

- `nodes.connectivity_status`
- `nodes.last_seen_at`

### 6.2 Data freshness source

Freshness bisa berasal dari:

- timestamp nilai terakhir pada channel binding
- runtime config diagram seperti `stale_timeout`

### 6.3 Operational source

Operational state bisa berasal dari:

- binding `status`
- binding `state`
- binding `fault`
- binding `rpm`
- binding `opening`
- binding nilai numerik lain terhadap threshold

---

## 7. Model status internal yang direkomendasikan

Supaya tidak campur aduk, node runtime idealnya punya struktur internal seperti:

- `connectivityState`
- `freshnessState`
- `operationalState`
- `visualState`

### 7.1 Connectivity state

Nilai yang direkomendasikan:

- `online`
- `offline`
- `unknown`

### 7.2 Freshness state

Nilai yang direkomendasikan:

- `fresh`
- `stale`
- `unknown`

### 7.3 Operational state

Nilai yang direkomendasikan:

- `ok`
- `warn`
- `alert`
- `off`
- `unknown`

### 7.4 Visual state

Nilai akhir yang dilihat user:

- `ok`
- `warn`
- `alert`
- `off`
- `offline`
- `stale`
- `unknown`

---

## 8. Aturan prioritas status visual

Karena satu node bisa punya banyak signal, perlu prioritas yang jelas.

### 8.1 Prioritas visual yang direkomendasikan

Urutan prioritas:

1. `offline`
2. `stale`
3. `alert`
4. `warn`
5. `off`
6. `ok`
7. `unknown`

### 8.2 Penjelasan

`offline` paling tinggi:

- kalau device tidak terhubung, status lain tidak lagi terlalu dipercaya

`stale` setelah offline:

- data lama harus terlihat, walau device belum dinyatakan offline

`alert` mengalahkan `warn` dan `ok`

`off` harus di bawah `alert/warn`:

- supaya `fault + off` tidak tertutup sebagai sekadar mati biasa

`unknown` dipakai saat tidak ada dasar kuat untuk status lain

---

## 9. Definisi awal tiap status untuk MVP

### 9.1 `offline`

Node dianggap `offline` jika salah satu kondisi berikut terpenuhi:

- `connectivity_status` device = offline
- atau last seen device melewati batas offline timeout

Catatan:

- offline timeout tidak harus sama dengan stale timeout

### 9.2 `stale`

Node dianggap `stale` jika:

- nilai binding terakhir terlalu lama
- tetapi connectivity belum dinyatakan offline

Contoh:

- channel terakhir update 20 detik lalu
- threshold stale diagram 15 detik
- node masih belum diputuskan offline

### 9.3 `off`

Node dianggap `off` jika:

- binding status/state menunjukkan kondisi non-running yang normal

Contoh:

- pompa status OFF
- valve CLOSED dalam konteks tertentu

Catatan:

- `off` bukan error

### 9.4 `ok`

Node dianggap `ok` jika:

- fresh
- tidak offline
- tidak ada fault
- tidak melewati threshold warn/alert
- tidak berada dalam state `off`

### 9.5 `warn`

Node dianggap `warn` jika:

- nilai mendekati threshold
- atau state tertentu ditandai warning

Untuk MVP, aturan ini bisa sederhana dulu.

### 9.6 `alert`

Node dianggap `alert` jika:

- nilai melewati threshold kritis
- atau binding `fault`/alarm menunjukkan kondisi bermasalah

### 9.7 `unknown`

Node dianggap `unknown` jika:

- binding belum lengkap
- belum ada nilai pertama
- mapping status belum cukup

---

## 10. Status untuk node multi-binding

Satu node bisa punya beberapa binding:

- `status`
- `rpm`
- `fault`
- `current`
- `pressure`

Karena itu perlu aturan agregasi.

### 10.1 Rekomendasi agregasi MVP

Gunakan pendekatan:

- binding tertentu diberi peran lebih penting

Urutan peran yang direkomendasikan:

1. `fault`
2. `status` atau `state`
3. binding nilai utama seperti `pressure`, `flow`, `level`, `rpm`
4. binding sekunder seperti `current`, `power`

### 10.2 Contoh

Pump:

- jika `fault=true` -> `alert`
- else jika device offline -> `offline`
- else jika data stale -> `stale`
- else jika `status=OFF` -> `off`
- else jika `rpm` di luar threshold -> `warn/alert`
- else `ok`

Valve:

- jika offline -> `offline`
- else jika stale -> `stale`
- else jika fault aktif -> `alert`
- else jika state = CLOSED -> bisa `off` atau `ok` tergantung kebijakan widget

Catatan:

- detail logika per widget type perlu ditulis di technical design

---

## 11. Perbedaan `off` vs `offline`

Ini harus sangat jelas di UI.

### 11.1 `off`

- perangkat atau aset tersedia
- state non-running
- bukan kehilangan komunikasi

### 11.2 `offline`

- perangkat tidak reachable atau tidak update
- data operasional tidak terpercaya

### 11.3 Implikasi visual

`off`

- abu netral
- masih terlihat sebagai state valid

`offline`

- abu lebih keras atau pattern khusus
- perlu indikator kehilangan komunikasi

---

## 12. Warna status yang direkomendasikan

Mengikuti baseline yang sudah ada:

- `ok`: hijau `#1D9E75`
- `warn`: amber `#EF9F27`
- `alert`: merah `#E24B4A`
- `off`: abu border / neutral grey
- `offline`: abu gelap atau muted grey dengan indikator koneksi putus
- `stale`: kuning redup atau amber muted
- `unknown`: abu muda

### 12.1 Catatan

`stale` dan `warn` jangan terlalu mirip.

User harus bisa membedakan:

- warning proses
- data yang terlambat

---

## 13. Peran threshold

Threshold untuk MVP belum perlu terlalu kompleks, tetapi modelnya harus jelas.

### 13.1 Sumber threshold

Threshold bisa berasal dari:

- config node SCADA
- metadata `sensor_channel`
- rule khusus nanti

### 13.2 Rekomendasi MVP

Untuk MVP, threshold visual utama sebaiknya dibaca dari config node SCADA.

Alasan:

- user SCADA bisa menyesuaikan tampilan operasional tanpa mengubah metadata global sensor

Metadata `sensor_channel.min_threshold` dan `max_threshold` tetap bisa dipakai sebagai default awal saat binding dipilih.

---

## 14. Siapa yang menghitung status

Ada dua pilihan:

- frontend
- backend

### 14.1 Rekomendasi MVP

Frontend menghitung visual state.

Backend cukup mengirim:

- connectivity info
- latest timestamp
- quality flag
- values
- metadata threshold default jika perlu

### 14.2 Alasan

- lebih cepat untuk MVP
- lebih fleksibel selama rule bisnis masih berubah
- belum perlu engine status terpusat

### 14.3 Konsekuensi

Karena frontend menghitung visual state:

- algoritma status harus didokumentasikan dengan jelas
- viewer dan editor harus memakai logic yang sama

---

## 15. Diagram-level status

Untuk MVP, status utama cukup di level node.

Diagram-level status tidak wajib kompleks.

### 15.1 Rekomendasi sederhana

Diagram dapat menampilkan summary ringan:

- jumlah node alert
- jumlah node warn
- jumlah node offline

Tetapi ini hanya derived view, bukan entity status baru.

---

## 16. Open questions yang perlu dibahas lanjut

Masih perlu dikunci:

- nilai timeout final untuk `stale`
- nilai timeout final untuk `offline`
- widget mana saja yang punya perilaku `off`
- apakah valve `closed` harus dianggap `off` atau `ok`
- apakah `quality_flag` tertentu langsung berarti `alert` atau `unknown`
- apakah `warn/alert` murni threshold numerik atau juga state-based

---

## 17. Rekomendasi keputusan default

Baseline yang direkomendasikan untuk MVP:

- bedakan `offline`, `stale`, `off`, dan `alert`
- visual state node dihitung di frontend
- gunakan model internal:
  - `connectivityState`
  - `freshnessState`
  - `operationalState`
  - `visualState`
- prioritas visual:
  - `offline`
  - `stale`
  - `alert`
  - `warn`
  - `off`
  - `ok`
  - `unknown`
- threshold utama dibaca dari config node SCADA
- metadata threshold sensor hanya menjadi default/helper

Jika baseline ini diterima, topik berikut yang paling tepat dibahas adalah:

- UX final mode view/edit
- atau frontend architecture detail
