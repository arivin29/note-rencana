# IoT Data Delivery Topology

Dokumen ini menjelaskan arsitektur forwarder data per owner untuk fitur _data delivery_ yang memungkinkan setiap tenant meneruskan telemetry dari server utama ke infrastruktur mereka sendiri (webhook maupun database relasional).

## Ringkasan Alur

```text
[Sensor & Node] 
     │
     ▼
[Ingestion Service] ──┬─> [Telemetry Store (TimescaleDB)]
                      │
                      └─> [Forwarding Orchestrator Queue]
                                 │
                                 ├─> [Webhook Worker] ──> HTTP endpoint milik owner
                                 └─> [DB Worker] ───────> MySQL / PostgreSQL owner
```

1. **Sensor & Node** mengirim payload ke server utama (protokol LoRaWAN, MQTT, HTTP, dsb.).
2. **Ingestion Service** melakukan normalisasi, validasi, dan menyimpan log ke `sensor_logs`.
3. Ingestion menempatkan _forwarding task_ ke **Forwarding Orchestrator Queue** jika owner memiliki konfigurasi aktif.
4. **Webhook Worker** atau **Database Worker** mengonsumsi task berdasarkan tipe konfigurasi dan meneruskan data menuju endpoint yang ditentukan owner.
5. Status keberhasilan / kegagalan disimpan di log monitoring per owner sehingga dapat ditampilkan di UI (mis. halaman IoT Owners).

## Komponen

| Komponen | Deskripsi | Catatan Implementasi |
| --- | --- | --- |
| Owner Forwarding Config API | CRUD konfigurasi forwarding. Mendukung banyak endpoint per owner. | Simpan di tabel `owner_forwarding_webhooks` / `owner_forwarding_databases`. Enkripsi field sensitif (token, password). |
| Ingestion Hook | Hook setelah data tersimpan. Mengecek konfigurasi owner dan menulis task ke queue. | Task minimal memuat `owner_id`, `channel_id`, `payload_id`, `forwarding_config_id`. |
| Forwarding Orchestrator Queue | Message queue (mis. Redis, RabbitMQ, SQS) untuk memisahkan ingestion dari proses kirim. | Menghindari blocking ingestion dan menyediakan retry policy. |
| Webhook Worker | Mengirim payload HTTP ke endpoint tenant. | - Mendukung HTTP method (POST/PUT) <br> - Header custom + secret HMAC <br> - Retries dengan exponential backoff. |
| Database Worker | Melakukan koneksi ke database tujuan (MySQL / PostgreSQL). | - Uji koneksi saat konfigurasi disimpan<br> - Format payload berupa batch insert/upsert<br> - Gunakan connection pooling per config. |
| Monitoring & Audit | Menyimpan status eksekusi task (success/fail). | UI menampilkan last sync, jumlah retry, error message. |

## Konfigurasi Per Owner

1. **Webhook**
   - URL
   - HTTP method (POST/PUT)
   - Headers (key/value)
   - Secret token (opsional, untuk signing)
   - Payload template (JSON dengan placeholder)
   - Retry policy (max retry, delay, backoff)
   - Status (enabled/disabled)

2. **Database Forwarder**
   - Target type: `mysql` atau `postgres`
   - Host, port, database, schema
   - Credential (username/password)
   - Table tujuan & mapping kolom
   - Mode tulis (`append`, `upsert`)
   - Batch size dan interval flush
   - Status (enabled/disabled)

## Cara Kerja Detail

1. **Penyimpanan konfigurasi**
   - Admin/owner membuka halaman IoT Owners → tab _Data Delivery_.
   - Mengisi form webhook / database dan menekan tombol _Test Connection_.
   - Backend menyimpan config + hasil test ke database.

2. **Ingestion**
   - Setelah telemetry diterima, service utama menyimpan ke TimescaleDB.
   - Hook memanggil `ForwardingConfigService` untuk mengambil semua config aktif milik owner terkait.
   - Untuk setiap config aktif, buat entry di queue `forwarding_tasks`.

3. **Eksekusi Worker**
   - Worker mengambil task:
     - Jika `type=webhook`: render payload (menggunakan template + data event), kirim HTTP request, log response.
     - Jika `type=db`: buka koneksi (pool), lakukan insert/upsert ke tabel target.
   - Pada kegagalan, worker mengatur retry (sesuai policy). Jika gagal permanen, tandai status `failed` dan notifikasi UI.

4. **Monitoring**
   - Simpan histori di tabel `forwarding_task_logs` (id_task, config_id, status, error_message, duration).
   - UI menampilkan ringkasan per config: total task, success rate, last error.

## Keamanan & Operasional

- Encrypt credential (DB password, webhook secret) menggunakan KMS atau libsodium.
- Validasi endpoint saat konfigurasi disimpan (sanitasi URL, cek protokol HTTPS).
- Rate limiting per owner agar tidak menyebabkan beban berlebih di worker.
- Observabilitas: metrics per config (TPS, error rate) + alert ke tim ops jika error menumpuk.

## Rencana Pengembangan

1. Tambah kolom konfigurasi di `migrasi.md`.
2. Buat service backend untuk CRUD dan test connection.
3. Implement ingestion hook + queue + worker.
4. Tambah UI (IoT Owners) untuk konfigurasi dan monitoring.
5. QA end-to-end menggunakan data dummy + endpoint webhook sandbox.

Dokumen ini dapat dilengkapi lagi dengan diagram sequence detail atau contoh payload template setelah backend siap.
