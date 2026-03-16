# SCADA Auth And Integration Blueprint

> Document type: Pre-technical analysis  
> Status: Draft for discussion  
> Scope: Menentukan batas integrasi Angular existing dan SCADA app terpisah, termasuk auth lintas frontend

---

## 1. Tujuan dokumen

Dokumen ini mendefinisikan bagaimana SCADA app akan hidup berdampingan dengan Angular existing tanpa mengganggu sistem yang sudah berjalan.

Fokus utama:

- boundary Angular vs SCADA
- launch flow dari Angular ke SCADA
- auth lintas frontend
- ownership context
- deployment boundary

Dokumen ini belum masuk detail implementasi token atau kode auth provider.

---

## 2. Prinsip integrasi

Prinsip yang dipakai:

- SCADA adalah app terpisah penuh
- Angular tetap menjadi admin/business app existing
- integrasi antar app harus seminimal mungkin
- auth source of truth tetap terpusat
- user tidak perlu merasa sedang pindah ke sistem lain yang sepenuhnya asing

---

## 3. Boundary Angular vs SCADA

### 3.1 Tanggung jawab Angular

Angular existing tetap menangani:

- login existing
- halaman admin
- project management
- owner/project context
- list SCADA pada detail project
- entry point untuk membuka SCADA

### 3.2 Tanggung jawab SCADA app

SCADA app menangani:

- SCADA diagram list jika nanti dibutuhkan di app SCADA sendiri
- builder
- viewer fullscreen
- runtime monitoring
- property editing
- save/load diagram

### 3.3 Yang tidak perlu dilakukan

Tidak direkomendasikan:

- embed SCADA ke layout Angular
- memaksa shared component tree antara Angular dan React
- memindahkan UX operational ke dalam admin shell

Alasan:

- SCADA adalah operational screen
- fullscreen lebih cocok
- release cycle lebih mudah dipisah

---

## 4. User journey yang direkomendasikan

Alur awal yang paling masuk akal:

1. user login ke Angular existing
2. user membuka detail project
3. Angular menampilkan list SCADA untuk project tersebut
4. user klik `Open SCADA`
5. browser membuka SCADA app terpisah
6. SCADA app memvalidasi session/auth user
7. SCADA app membuka viewer atau editor sesuai context

Jika user masuk ke SCADA tanpa context project yang jelas, SCADA tetap harus bisa:

- meminta validasi auth
- membaca parameter route
- menolak akses bila project/diagram tidak valid

---

## 5. Ownership context

Keputusan existing yang sudah jelas:

- SCADA dibuka dari context project
- project tetap berada di bawah owner

### 5.1 Konteks minimal yang perlu diketahui SCADA

SCADA idealnya mengetahui:

- `id_owner`
- `id_project`
- `id_diagram` jika langsung buka diagram tertentu
- mode buka: viewer atau edit

### 5.2 Kenapa context ini penting

- validasi permission
- load diagram yang benar
- membatasi query runtime dan list resource
- menjaga alignment dengan struktur bisnis existing

---

## 6. Strategi auth lintas frontend

Ada tiga pola besar yang mungkin.

### 6.1 Opsi A: shared cookie / shared session antar subdomain

Contoh:

- `admin.domain.com`
- `scada.domain.com`

Dengan cookie auth yang valid untuk parent domain.

Kelebihan:

- SSO paling bersih
- user experience paling mulus
- tidak perlu kirim token lewat URL

Kekurangan:

- butuh infrastruktur auth yang siap
- butuh penataan cookie, CORS, dan session policy yang matang

### 6.2 Opsi B: bearer token sharing langsung

Angular dan SCADA sama-sama memakai token bearer yang sama.

Kelebihan:

- terasa cepat di awal

Kekurangan:

- rawan bila token dilempar antar app tanpa desain yang rapi
- localStorage lintas origin tidak bisa dishare
- refresh token flow lebih mudah berantakan

Rekomendasi:

- jangan jadikan ini pola jangka panjang

### 6.3 Opsi C: launch token exchange

Alur:

1. user login di Angular
2. user klik `Open SCADA`
3. Angular/backend membuat launch token sekali pakai
4. browser redirect ke SCADA dengan launch token
5. SCADA tukar launch token menjadi session/token SCADA yang valid

Kelebihan:

- aman untuk app terpisah
- tidak perlu share localStorage
- cocok untuk fase transisi

Kekurangan:

- perlu endpoint tambahan
- flow sedikit lebih kompleks

---

## 7. Rekomendasi auth fase awal

Untuk fase awal, rekomendasi yang paling realistis:

- Angular tetap menjadi pintu masuk user
- SCADA dibuka lewat link dari Angular
- auth tetap memakai backend/auth source yang sama
- jika shared cookie belum siap, gunakan pola `launch token exchange`

### 7.1 Kenapa bukan token bearer lewat query string biasa

Karena itu rawan:

- terekam di history browser
- bisa bocor ke log
- sulit dikontrol masa aktifnya

Jika tetap perlu mekanisme via URL, maka token harus:

- one-time
- short-lived
- khusus untuk proses exchange

---

## 8. Launch flow yang direkomendasikan

### 8.1 Fase awal

Launch flow pragmatis:

1. Angular detail project menampilkan list diagram SCADA
2. user klik salah satu diagram
3. Angular request `launch token` ke backend
4. backend mengembalikan token sekali pakai + target URL SCADA
5. browser redirect ke SCADA app
6. SCADA exchange token
7. SCADA load diagram dan mode yang diminta

### 8.2 Parameter yang dibutuhkan

Minimal context yang dibawa:

- `projectId`
- `diagramId` opsional
- `mode=view|edit`
- launch token sekali pakai

### 8.3 Jika user belum punya akses

SCADA app harus:

- menolak akses
- menampilkan pesan akses ditolak atau redirect balik

---

## 9. Session lifecycle

Hal yang harus dirancang sejak awal:

- bagaimana SCADA tahu user masih login
- apa yang terjadi saat token expired
- bagaimana logout bekerja

### 9.1 Rekomendasi default

Untuk MVP:

- session/auth source tetap terpusat
- SCADA melakukan auth check saat startup
- jika session tidak valid, redirect ke login atau kembali ke Angular entry

### 9.2 Logout

Minimal yang harus terjadi:

- logout dari sistem utama harus membuat akses SCADA tidak valid

Tidak wajib di MVP:

- single logout flow yang sangat kompleks lintas banyak app

---

## 10. Permission baseline

Permission MVP sebaiknya sederhana.

### 10.1 Level yang direkomendasikan

- user boleh lihat diagram project jika memang punya akses ke project
- user boleh edit diagram jika punya hak edit project/SCADA

### 10.2 Jangan terlalu detail di fase awal

Belum perlu:

- permission per node
- permission per edge
- permission per binding

### 10.3 Source of truth permission

Tetap gunakan domain existing:

- owner access
- project access
- role user existing

SCADA tidak perlu membuat sistem permission yang sepenuhnya terpisah untuk MVP.

---

## 11. Routing strategy

### 11.1 Angular routes

Angular cukup punya:

- detail project
- list diagram SCADA
- tombol open viewer/edit

### 11.2 SCADA app routes

SCADA app sebaiknya punya route yang eksplisit:

- `/scada`
- `/scada/projects/:projectId`
- `/scada/diagrams/:diagramId/view`
- `/scada/diagrams/:diagramId/edit`

Atau versi yang lebih ringkas sesuai preferensi tim.

### 11.3 Kenapa route edit dan view dipisah

Walau page bisa satu engine dengan toggle edit, route terpisah tetap berguna untuk:

- deep link
- permission check
- user expectation
- audit dan navigation clarity

---

## 12. Deployment boundary

### 12.1 Rekomendasi struktur

Contoh struktur yang sehat:

- `admin.company.com`
- `scada.company.com`
- `api.company.com`

Atau environment internal yang ekuivalen.

### 12.2 Kenapa ini baik

- lifecycle deploy terpisah
- auth lebih mudah diatur
- operational screen tidak bergantung ke shell admin
- troubleshooting lebih jelas

### 12.3 Fase awal lokal/development

Di local/dev tetap bisa:

- Angular dev server
- SCADA dev server
- backend server yang sama

Yang penting dari awal path dan auth flow tidak diasumsikan satu origin secara permanen.

---

## 13. Kontrak integrasi minimal

Supaya Angular dan SCADA tidak saling mengikat terlalu dalam, kontrak integrasi minimal sebaiknya hanya:

- link pembuka SCADA
- project/diagram context
- auth handshake

Yang sebaiknya tidak dilakukan:

- sharing global state antar frontend
- direct component embedding
- saling membaca storage internal tanpa kontrak resmi

---

## 14. Risiko utama

Jika blueprint integrasi tidak dikunci, risiko besarnya:

- SCADA diam-diam tergantung ke Angular shell
- auth lintas frontend jadi tambal sulam
- deployment jadi sulit dipisah
- permission check ganda dan tidak konsisten
- pengalaman user kacau saat session expired

---

## 15. Open questions

Topik yang masih perlu dikunci:

- apakah infrastruktur auth sekarang lebih cocok ke shared cookie atau launch token
- apakah SCADA perlu punya halaman list diagram sendiri di app SCADA
- apakah edit route dan view route dipisah permanen atau cukup mode param
- bagaimana redirect jika session expired di tengah viewer aktif
- apakah diagram list hanya dari Angular atau juga tersedia langsung di SCADA app

---

## 16. Rekomendasi keputusan default

Baseline yang direkomendasikan:

- SCADA adalah app terpisah penuh
- Angular menjadi launcher dari detail project
- ownership context minimal adalah owner + project + diagram
- source of truth auth tetap terpusat
- fase awal memakai pola link dari Angular ke SCADA
- jika shared cookie belum siap, gunakan launch token exchange
- permission MVP mengikuti akses project existing
- route viewer dan editor dipisah secara eksplisit

Jika baseline ini diterima, langkah berikutnya yang paling tepat adalah:

`05-DATABASE-STRATEGY-SCADA.md`

Fokusnya:

- rancangan tabel inti SCADA
- mana relational, mana JSONB
- naming strategy
- field minimum untuk MVP
- ruang untuk evolusi jangka panjang
