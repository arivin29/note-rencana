---
name: clickhouse-backfill
description: Menambal lubang data ClickHouse (iot.sensor_telemetry) dari Postgres saat sinkronisasi gtw putus — deteksi lubang, jalankan scripts/clickhouse-backfill.js, verifikasi, dan kenali penyebab yang berulang (TOO_MANY_PARTS, buffer memori gtw yang dipangkas, kuirk timezone). Pakai saat report/Grafana kosong padahal Postgres ada datanya, atau setiap kali ClickHouse berhenti menerima data.
---

# Backfill ClickHouse dari Postgres

## Gejala yang menandai masalah ini

- Halaman **Report** (`/api/reports/preview`) atau dashboard Grafana kosong untuk periode tertentu,
  padahal halaman detail node menampilkan angka terbaru.
- Sebabnya: halaman node baca **Postgres**, sedangkan report & Grafana baca **ClickHouse**.

## Langkah 1 — pastikan memang ClickHouse yang tertinggal

```bash
cd iot-service/iot-gtw && set -a && source .env && set +a

# ClickHouse terbaru
curl -s "http://${CLICKHOUSE_HOST}:${CLICKHOUSE_PORT}/" -u "${CLICKHOUSE_USERNAME}:${CLICKHOUSE_PASSWORD}" \
  --data-binary "SELECT max(event_time) FROM iot.sensor_telemetry FORMAT TSV"

# Postgres terbaru
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_NAME" -X -t -A \
  -c "SELECT max(ts), count(*) FILTER (WHERE ts > now() - interval '10 minutes') FROM sensor_logs;"
```

Kalau Postgres jalan terus dan ClickHouse mandek → lanjut.

## Langkah 2 — data lama TIDAK menyusul sendiri

`ClickHouseService` di gtw hanya menahan baris di **buffer memori**, flush tiap
`CLICKHOUSE_FLUSH_INTERVAL_MS` (5 dtk). Saat ClickHouse mati:

- `trimBuffer()` membuang baris terlama begitu buffer melewati `batchSize × 10` (10.000 baris);
- restart gtw mengosongkan buffer sepenuhnya.

Tidak ada mekanisme resync PG→CH. **Selalu perlu backfill manual** — Postgres tetap lengkap.

## Langkah 3 — jalankan script

```bash
cd iot-service/iot-gtw

node scripts/clickhouse-backfill.js --dry-run          # hitung dulu, tidak menulis
node scripts/clickhouse-backfill.js                    # auto: max(event_time) CH → sekarang-lag
node scripts/clickhouse-backfill.js --from '2026-09-08 13:34:21' --to '2026-09-10 04:00:00'
node scripts/clickhouse-backfill.js --loop 300         # mode jaga: ulang tiap 5 menit
```

Opsi penting: `--chunk-minutes` (default 30), `--lag-seconds` (default 300, jarak aman dari
"sekarang" supaya tidak balapan dengan buffer gtw yang belum flush), `--skip-latest`.

**Aman diulang** — baris yang sudah ada dilewati berdasarkan `pg_sensor_log_id`.
Baris hasil backfill ditandai `iot_log_id = 00000000-...` dan `signal_quality = 0`
(dua nilai itu tidak tersimpan di `sensor_logs`).

Untuk jalan berkala pilih salah satu:

```bash
# cron tiap 10 menit (satu kali jalan per pemanggilan)
*/10 * * * * cd /path/iot-gtw && /usr/bin/node scripts/clickhouse-backfill.js --quiet >> /var/log/ch-backfill.log 2>&1

# atau daemon (Vito/pm2) — proses hidup terus
node scripts/clickhouse-backfill.js --loop 600 --quiet
```

## Langkah 4 — verifikasi

```bash
# bandingkan jumlah baris per hari
PGPASSWORD="$DB_PASSWORD" psql ... -c "SELECT date_trunc('day',ts) d, count(*) FROM sensor_logs WHERE ts >= 'AWAL' GROUP BY 1 ORDER BY 1;"
curl -s ... --data-binary "SELECT toDate(event_time) d, count() FROM iot.sensor_telemetry WHERE event_time >= 'AWAL' GROUP BY d ORDER BY d FORMAT TSVWithNames"

# pastikan tak ada dobel
curl -s ... --data-binary "SELECT count() FROM (SELECT pg_sensor_log_id FROM iot.sensor_telemetry WHERE event_time >= 'AWAL' GROUP BY pg_sensor_log_id HAVING count() > 1) FORMAT TSV"
```

## Kuirk yang wajib diingat

1. **Timezone.** gtw menulis `date.toISOString()` (jam dinding **UTC**) ke kolom `DateTime64(3)`
   yang bertimezone Asia/Jakarta. Jadi isi kolom = jam UTC, tapi ClickHouse memperlakukannya
   sebagai Jakarta → epoch-nya 7 jam di belakang. Semua kueri report memakai `addHours(event_time, 7)`
   untuk menampilkan. Script backfill sudah meniru konvensi ini; **jangan** dikonversi ke lokal.
2. **`sensor_telemetry` = MergeTree biasa** (bukan Replacing) → insert ulang = baris dobel.
   Karena itu dedupe wajib lewat `pg_sensor_log_id`.
3. **`sensor_channel_latest` = ReplacingMergeTree(last_update)** → aman di-insert ulang,
   baca selalu dengan `FINAL`. Script menyegarkannya otomatis (matikan dengan `--skip-latest`).
4. **Nama env beda antar repo**: gtw pakai `DB_NAME`, iot-backend-go pakai `DB_DATABASE`.
5. Kolom `sensor_catalog` berisi **UUID katalog**, `project_code` berisi **nama project**
   (bukan kode) — ikuti apa adanya supaya konsisten dengan baris lama.

## Penyebab berulang yang perlu dicek

### TOO_MANY_PARTS (kejadian 8–10 Sep 2026)

```
Code: 252. DB::Exception: Too many parts (3000 with average size of 4.43 KiB)
in table 'iot.sensor_telemetry'. Merges are processing significantly slower than inserts.
```

Insert ditolak **oleh ClickHouse**, bukan koneksi putus. Restart gtw tidak menolong.
Butuh user admin ClickHouse (user `iot_ingest` tidak punya hak `OPTIMIZE` maupun akses
`system.parts`):

```sql
SELECT count() FROM system.parts WHERE table='sensor_telemetry' AND active;
SELECT * FROM system.merges;
SELECT * FROM system.errors ORDER BY last_error_time DESC LIMIT 10;
SYSTEM START MERGES iot.sensor_telemetry;              -- kalau merge pernah di-stop
OPTIMIZE TABLE iot.sensor_telemetry PARTITION ID '202609';
```

Cek juga `df -h` di server — merge berhenti total kalau disk penuh.

**Pencegahan:** part menumpuk karena gtw flush tiap 5 detik dengan isi beberapa baris saja
(≈13 rb baris/hari terpecah jadi ribuan part kecil). Naikkan di `.env` server:

```
CLICKHOUSE_FLUSH_INTERVAL_MS=60000   # dari 5000
CLICKHOUSE_BATCH_SIZE=1000
```

Satu part per menit jauh lebih ramah bagi merge, dan buffer 60 detik masih aman karena
Postgres tetap sumber kebenaran.

### Koneksi ClickHouse mati

Fix "reconnect tak pernah nyerah" ada di commit `801252c` / `7928411` — pastikan build di
server sudah memuatnya. Lihat juga [RS485-CONFIG-DUPLICATE-BUG.md](../../../iot-gtw/docs/RS485-CONFIG-DUPLICATE-BUG.md)
untuk pola "kode sudah benar di repo, tapi belum ter-deploy".

### CLICKHOUSE_ENABLED=false

Flag untuk on-prem; kalau `.env` server pernah disalin dari template on-prem, semua tulis
ke ClickHouse jadi no-op **tanpa error**. Cek log boot gtw.
