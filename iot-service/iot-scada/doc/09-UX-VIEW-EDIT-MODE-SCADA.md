# SCADA UX View And Edit Mode

> Document type: Pre-technical analysis  
> Status: Draft for discussion  
> Scope: Menentukan pengalaman pengguna untuk viewer dan editor SCADA dalam satu aplikasi fullscreen

---

## 1. Tujuan dokumen

Dokumen ini mendefinisikan bagaimana mode `view` dan mode `edit` bekerja di SCADA app.

Tujuannya:

- memastikan UX builder dan viewer tidak saling merusak
- menjaga operasional fullscreen tetap bersih
- mengikuti kebutuhan bahwa edit dan view dapat berjalan dalam satu engine halaman
- memberi dasar untuk desain frontend yang konsisten

---

## 2. Keputusan dasar yang sudah ada

Baseline dari diskusi saat ini:

- SCADA adalah fullscreen app
- builder dan viewer sama-sama masuk MVP
- editor dan viewer bisa berada dalam satu halaman/engine
- mode edit diaktifkan lewat toggle atau action kecil
- saat mode edit aktif, menu edit muncul
- saat tambah atau edit widget/node, gunakan drawer/component terpisah
- autosave tidak dipakai

---

## 3. Prinsip UX yang direkomendasikan

Prinsip utama:

- mode view adalah default experience
- mode edit adalah layer kerja, bukan halaman admin terpisah yang berat
- canvas tetap menjadi pusat pengalaman
- chrome UI harus minimal
- editing tools muncul saat dibutuhkan

Artinya:

- tampilan normal harus terasa seperti layar operasional
- saat edit aktif, tool muncul secukupnya tanpa menghancurkan konteks diagram

---

## 4. Model UX yang direkomendasikan

Rekomendasi utama:

- satu engine halaman fullscreen
- dua mode utama:
  - `view mode`
  - `edit mode`

### 4.1 View mode

Karakter:

- fullscreen bersih
- fokus ke diagram
- runtime polling aktif
- interaksi minim
- toolbar sangat kecil

### 4.2 Edit mode

Karakter:

- masih di halaman yang sama
- canvas tetap terlihat
- palette/tool edit muncul
- property/config panel muncul saat item dipilih
- save manual tersedia

---

## 5. Kenapa satu engine lebih cocok untuk kasus ini

Untuk kebutuhan yang kamu jelaskan, satu engine lebih cocok daripada memisahkan viewer dan editor ke dua halaman yang sangat berbeda.

Alasannya:

- user tetap melihat diagram yang sama
- perpindahan mode terasa natural
- runtime context tidak hilang
- lebih cocok dengan pola “toggle edit”
- lebih cepat untuk MVP

Tetapi walau engine sama, route `view` dan `edit` tetap sebaiknya eksplisit.

---

## 6. Route strategy yang direkomendasikan

### 6.1 Route yang disarankan

- `/scada/diagrams/:diagramId/view`
- `/scada/diagrams/:diagramId/edit`

### 6.2 Kenapa route tetap dipisah

Walau halaman dasarnya satu engine, route terpisah tetap penting untuk:

- deep link
- permission check
- user expectation
- audit
- launch flow dari Angular

### 6.3 Perilaku route

`view`

- load diagram
- polling aktif
- tool edit tersembunyi

`edit`

- load diagram
- polling boleh tetap aktif
- tool edit tersedia
- dirty state dan save flow aktif

---

## 7. Layout UX yang direkomendasikan

### 7.1 Struktur layar

Komposisi yang direkomendasikan:

- top bar tipis
- canvas utama fullscreen
- tools kecil di kiri saat edit aktif
- drawer/panel edit di kanan saat item dipilih atau saat add component

### 7.2 Top bar

Fungsi:

- nama diagram
- indicator mode
- toggle edit
- save button saat edit
- refresh/runtime indicator
- back/navigation action ringan

### 7.3 Left tools

Saat edit mode aktif:

- tombol add node
- selection tool
- fit view
- maybe delete/duplicate shortcuts

Left tools sebaiknya tidak terlalu besar seperti sidebar admin.

Rekomendasi:

- vertical floating tool rail kecil

### 7.4 Right drawer / panel

Dipakai untuk:

- add component
- edit selected node
- edit selected edge
- diagram settings

Rekomendasi:

- gunakan drawer atau inspector panel yang bisa dibuka/tutup
- bukan sidebar permanen besar jika tidak perlu

---

## 8. UX flow mode view

### 8.1 Fokus utama

Mode view dipakai untuk monitoring.

Yang user lihat:

- diagram penuh
- nilai sensor
- status warna
- animasi flow
- alarm/status visual

### 8.2 Interaksi yang diperbolehkan

- zoom
- pan
- fit to screen
- click node untuk lihat detail ringan
- refresh manual

### 8.3 Interaksi yang tidak perlu di mode view

- drag node
- connect edge
- edit property
- add/delete component

---

## 9. UX flow mode edit

### 9.1 Fokus utama

Mode edit dipakai untuk menyusun atau mengubah diagram.

Yang user butuhkan:

- tambah node
- pilih node/edge
- ubah posisi
- sambung pipa
- ubah property
- simpan perubahan

### 9.2 Komponen UI yang aktif

- tool rail kiri
- drawer add component
- property panel kanan
- tombol save
- dirty state indicator

### 9.3 Runtime saat edit

Rekomendasi:

- runtime tetap boleh aktif
- tetapi perubahan runtime tidak boleh mengganggu editing topology

Contoh:

- warna/status node tetap update
- posisi dan koneksi tidak ikut berubah

---

## 10. Add node flow yang direkomendasikan

### 10.1 Trigger

User klik tombol add dari tool rail kecil.

### 10.2 UI behavior

Drawer kiri atau kanan terbuka dan menampilkan library komponen:

- intake
- pump
- valve
- flowmeter
- pressure
- reservoir
- wtp
- junction

### 10.3 Interaksi

User:

- klik komponen untuk add ke canvas
- atau drag dari drawer ke canvas jika nanti diperlukan

### 10.4 Rekomendasi MVP

Untuk MVP, klik-to-add sudah cukup.

Drag from palette bisa ditambahkan jika memang tidak memberatkan.

---

## 11. Edit property flow yang direkomendasikan

### 11.1 Saat node dipilih

Panel kanan menampilkan:

- basic info
- binding
- thresholds
- visual settings ringan

### 11.2 Saat edge dipilih

Panel kanan menampilkan:

- pipe type
- direction
- animation
- style dasar

### 11.3 Saat tidak ada selection

Panel kanan bisa menampilkan:

- diagram settings
- atau tertutup

### 11.4 Rekomendasi

Panel kanan sebaiknya context-sensitive.

Jangan selalu penuh dengan form bila user tidak sedang mengedit sesuatu.

---

## 12. Toggle edit behavior

### 12.1 Saat masuk edit mode

Yang terjadi:

- tools edit muncul
- canvas jadi selectable/draggable
- node dan edge bisa dimodifikasi
- save button aktif

### 12.2 Saat kembali ke view mode

Jika `isDirty = false`:

- langsung kembali ke mode view

Jika `isDirty = true`:

- tampilkan confirm:
  - save changes
  - discard changes
  - cancel

### 12.3 Kenapa ini penting

Karena autosave tidak dipakai, user tidak boleh kehilangan perubahan diam-diam.

---

## 13. Save UX

### 13.1 Di edit mode

Harus ada:

- `Save`
- status `Unsaved changes`
- status `Saving...`
- feedback berhasil/gagal

### 13.2 Rekomendasi visual

Top bar kanan cukup untuk:

- Save
- Cancel/discard
- mode indicator

Jangan membuat dialog save terlalu sering kecuali user mau keluar mode edit dengan perubahan belum tersimpan.

---

## 14. Detail drawer vs sidebar permanen

Ada dua pendekatan:

- sidebar permanen
- drawer on-demand

### 14.1 Rekomendasi

Gunakan kombinasi:

- tool rail kecil permanen saat edit
- drawer/panel on-demand untuk detail

Ini paling cocok dengan kebutuhan:

- tetap terasa ringan
- tidak seperti admin panel besar
- canvas tetap dominan

---

## 15. Viewer detail interaction

Saat user klik node di mode view, sebaiknya jangan langsung membuka form edit.

Yang lebih tepat:

- tampil mini detail card
- atau side detail ringan readonly

Isi bisa berupa:

- label
- latest value utama
- unit
- timestamp terakhir
- status

Ini memberi manfaat operasional tanpa mengganggu tampilan.

---

## 16. Mobile consideration

Mobile bukan prioritas utama, tetapi jangan diabaikan.

### 16.1 Rekomendasi MVP

- mobile support minimal untuk view mode
- edit mode fokus desktop/tablet dulu

### 16.2 Alasan

- canvas editing di mobile akan rumit
- viewer read-only masih realistis

### 16.3 Implikasi UX

Di layar kecil:

- tool edit bisa dibatasi
- panel berubah menjadi bottom sheet atau full drawer

---

## 17. Risiko UX yang perlu dihindari

Hal yang sebaiknya dihindari:

- toolbar terlalu besar
- panel kiri dan kanan permanen sehingga canvas sempit
- edit mode terasa seperti masuk aplikasi lain
- runtime update menyebabkan node bergeser atau selection hilang
- terlalu banyak modal bertumpuk

---

## 18. Rekomendasi keputusan default

Baseline yang direkomendasikan:

- gunakan satu engine fullscreen untuk view dan edit
- tetap pisahkan route `view` dan `edit`
- mode view adalah default, bersih, dan operasional
- mode edit menampilkan tool rail kecil di kiri
- add/edit memakai drawer atau inspector on-demand
- property panel kanan bersifat context-sensitive
- runtime tetap boleh aktif saat edit
- mobile MVP fokus ke view mode saja

Jika baseline ini diterima, langkah berikutnya yang paling masuk akal adalah:

- frontend architecture detail
- atau API contract detail
