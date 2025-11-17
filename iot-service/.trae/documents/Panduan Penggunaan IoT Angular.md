## Prasyarat
- Node.js (disarankan v20+) dan npm terpasang
- Backend tersedia (opsional) di `http://localhost:3000` untuk SDK/API

## Instalasi
- `cd iot-angular`
- `npm install`

## Menjalankan Dev Server
- `npm start`
- Akses di `http://localhost:4200`

## Konfigurasi API
- Edit `src/environments/environment.ts` untuk mengarah ke backend Anda
- Kunci yang digunakan: `apiUrl` di `iot-angular/src/environments/environment.ts:8`
- SDK diinisialisasi dengan nilai ini: `ApiModule.forRoot({ rootUrl: environment.apiUrl })` di `iot-angular/src/app/app.module.ts:234`

## Generate / Update SDK
- Pastikan backend Swagger JSON bisa diakses di `http://<host>:<port>/api-json`
- Perintah: `npm run generate-api`
- Sumber & keluaran SDK (konfigurasi):
  - Input: `ng-openapi-gen.json` → `input` di `iot-angular/ng-openapi-gen.json:3`
  - Output: `ng-openapi-gen.json` → `output` di `iot-angular/ng-openapi-gen.json:4`
- SDK akan dihasilkan ke `src/sdk/core/`

## Verifikasi
- Buka `http://localhost:4200` dan cek konsol jaringan (Network) untuk panggilan API
- Jika backend aktif: buka Swagger UI `http://localhost:3000/api` dan JSON `http://localhost:3000/api-json`

## Struktur Penting
- `src/sdk/core/` → layanan & model hasil generate (jangan diubah manual)
- `src/app/app.module.ts` → inisialisasi SDK (`ApiModule`) dan modul aplikasi
- `src/environments/*.ts` → konfigurasi `apiUrl` dev/prod

## Catatan
- Setelah mengubah `apiUrl`, cukup restart dev server untuk menerapkan
- Jalankan `npm run generate-api` setiap ada perubahan endpoint backend

Konfirmasi: Saya akan menyiapkan panduan singkat interaktif di dalam aplikasi (help page) setelah Anda menyetujui rencana ini.