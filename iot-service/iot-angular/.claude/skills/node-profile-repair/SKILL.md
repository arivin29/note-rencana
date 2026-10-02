---
name: node-profile-repair
description: Deteksi dan perbaiki node_profile yang rusak di Helios — profil dibagi beberapa node (termasuk lintas owner), mapping menunjuk channel milik node lain, atau node tanpa profil. Gejalanya data node tidak masuk padahal alat rajin kirim. Berisi 4 kueri sapu, resep perbaikan transaksional, dan cara memulihkan data yang terlanjur hilang lewat proses-ulang iot_log. Pakai tiap ada laporan "channel kosong padahal device online", "node ini kok pakai profil node lain", atau sebelum/sesudah pairing & remapping massal.
---

# Perbaikan node_profile

## Aturan yang dilanggar

Di Helios **setiap node wajib punya `node_profile` sendiri**. Isi `mapping_json` boleh identik
antar node bermodel sama, tapi **instance-nya tidak boleh dibagi** — karena mapping memuat
`idSensorChannel` yang menunjuk channel milik satu node tertentu. Begitu satu profil dipakai
dua node, hanya satu yang datanya tertulis; sisanya dibuang **tanpa error**.

Konvensi: `code = profile-<bagian numerik kode node>` (node `HELIO-352592572346427` →
`profile-352592572346427`). `UNIQUE(id_node_model, code)`, jadi kode harus unik per model.

## Gejala

- Halaman node tampak normal, tapi channel-nya tidak pernah terisi / berhenti terisi.
- `iot_log` penuh payload dari device itu, `sensor_logs` kosong di periode yang sama.
- Nama profil di halaman node terasa asing (nama node/lokasi milik orang lain).
- Report & Grafana kosong untuk node tersebut.

## Langkah 1 — empat kueri sapu

Jalankan semuanya; yang sehat mengembalikan 0 baris.

```sql
-- (1) profil dipakai lebih dari satu node  ← pelanggaran paling parah, bisa lintas owner
SELECT np.id_node_profile, np.code, np.name, count(*) AS jumlah_node,
       string_agg(n.code || ' [' || o.owner_code || ']', ', ' ORDER BY n.code) AS node
FROM node_profiles np
JOIN nodes n ON n.id_node_profile = np.id_node_profile
JOIN projects p ON p.id_project = n.id_project
JOIN owners o ON o.id_owner = p.id_owner
GROUP BY 1,2,3 HAVING count(*) > 1;

-- (2) mapping menunjuk channel milik NODE LAIN (atau channel yang sudah tidak ada)
WITH m AS (
  SELECT n.id_node, n.code AS node_code, o.owner_code, np.code AS profil,
         (jsonb_array_elements(jsonb_array_elements(np.mapping_json->'sensors')->'channels')
            ->>'idSensorChannel')::uuid AS ch
  FROM nodes n
  JOIN node_profiles np ON np.id_node_profile = n.id_node_profile
  JOIN projects p ON p.id_project = n.id_project
  JOIN owners o ON o.id_owner = p.id_owner
  WHERE jsonb_typeof(np.mapping_json->'sensors') = 'array'
)
SELECT m.node_code, m.owner_code, m.profil, m.ch, n2.code AS channel_milik_node
FROM m
LEFT JOIN sensor_channels sc ON sc.id_sensor_channel = m.ch
LEFT JOIN sensors s ON s.id_sensor = sc.id_sensor
LEFT JOIN nodes n2 ON n2.id_node = s.id_node
WHERE sc.id_sensor_channel IS NULL OR n2.id_node <> m.id_node;

-- (3) node yang masih kirim payload tapi channel-nya tidak terisi  ← kerusakan AKTIF
WITH kirim AS (
  SELECT device_id, count(*) AS payload, max(created_at) AS payload_terakhir
  FROM iot_log WHERE created_at > now() - interval '3 days' AND device_id IS NOT NULL
  GROUP BY device_id
)
SELECT n.code, o.owner_code, k.payload, k.payload_terakhir::timestamp(0),
       max(l.ts)::timestamp(0) AS data_channel_terakhir,
       COALESCE(np.code, 'TANPA PROFIL') AS profil
FROM kirim k
JOIN nodes n ON n.code = k.device_id
JOIN projects p ON p.id_project = n.id_project JOIN owners o ON o.id_owner = p.id_owner
LEFT JOIN node_profiles np ON np.id_node_profile = n.id_node_profile
LEFT JOIN sensors s ON s.id_node = n.id_node
LEFT JOIN sensor_channels sc ON sc.id_sensor = s.id_sensor
LEFT JOIN LATERAL (SELECT ts FROM sensor_logs sl
                    WHERE sl.id_sensor_channel = sc.id_sensor_channel
                    ORDER BY ts DESC LIMIT 1) l ON true
GROUP BY n.code, o.owner_code, k.payload, k.payload_terakhir, np.code
HAVING max(l.ts) IS NULL OR max(l.ts) < now() - interval '3 hours';

-- (4) channel milik node yang tidak ikut dipetakan (tak akan pernah terisi)
--     lihat versi lengkap di bagian "Varian" di bawah
```

**Baca hasil kueri (3) dengan hati-hati:** kalau `data_channel_terakhir` = `payload_terakhir`,
berarti mapping-nya sehat dan node itu memang baru berhenti kirim (alat mati) — bukan kasus ini.

## Langkah 2 — resep perbaikan

Satu transaksi. Pola untuk profil yang dibagi N node:

1. **Tentukan pemilik sah**: node yang `idSensorChannel` di mapping-nya benar-benar miliknya.
   Profil itu tetap jadi miliknya; kalau `code`-nya memakai serial node lain, ganti agar sesuai.
2. **Node lain dapat profil baru** masing-masing, isi mapping sama persis tapi
   `idSensor`/`idSensorChannel` ditukar ke milik node tersebut. `payloadPath` biasanya sama
   untuk model yang sama (contoh keluarga FMB130 tekanan: `sensors.adc1`).
3. `UPDATE nodes SET id_node_profile = <profil baru>` untuk tiap node.

```sql
BEGIN;
UPDATE node_profiles SET code = 'profile-<serial pemilik sah>', name = '<nama node pemilik>',
       id_project = '<project pemilik>', updated_at = now()
 WHERE id_node_profile = '<profil bersama>';

WITH baru AS (
  INSERT INTO node_profiles (id_node_model, id_project, code, name, parser_type, mapping_json, enabled)
  VALUES ('<model node>', '<project node>', 'profile-<serial node>', '<nama node>', 'json',
          '<mapping_json dgn channel milik node itu>'::jsonb, true)
  RETURNING id_node_profile
)
UPDATE nodes SET id_node_profile = (SELECT id_node_profile FROM baru), updated_at = now()
 WHERE id_node = '<id node>';
COMMIT;
```

Bentuk `mapping_json` minimal:

```json
{"metadata": {"deviceId": {"path":"device_id","type":"string"},
              "timestamp": {"path":"timestamp","type":"timestamp"},
              "signalQuality": {"path":"gps.accuracy","type":"string"}},
 "sensors": [{"label":"<katalog>.<label sensor>", "idSensor":"<uuid sensor node ini>",
   "channels":[{"unit":"bar","channelCode":"tekanan","payloadPath":"sensors.adc1",
                "idSensorChannel":"<uuid channel node ini>",
                "idChannelTemplate":"<uuid yang sama>"}]}]}
```

**Verifikasi wajib** — ulangi kueri sapu (semua harus 0 baris), lalu tunggu ±2 menit dan pastikan
`sensor_logs` channel itu menerima baris baru.

**Verifikasi kalibrasi** (jangan dilewat): bandingkan `value_raw → value_engineered` sebelum rusak
dan sesudah diperbaiki untuk nilai mentah yang sama. Harus identik sampai digit terakhir; kalau
berbeda, ada `transform_script` / konteks kalibrasi yang belum ikut disalin.

```sql
SELECT 'sebelum' AS periode, value_raw, value_engineered FROM sensor_logs
WHERE id_sensor_channel='<ch>' AND ts BETWEEN '<awal>' AND '<rusak>' GROUP BY 1,2,3
UNION ALL
SELECT 'sesudah', value_raw, value_engineered FROM sensor_logs
WHERE id_sensor_channel='<ch>' AND ts > '<perbaikan>' GROUP BY 1,2,3 ORDER BY 2,1;
```

## Langkah 3 — pulihkan data yang hilang

Payload mentah **tidak ikut hilang**: semuanya tersimpan di `iot_log`. Jangan menghitung ulang
nilai engineering sendiri — pakai pipeline aslinya supaya kalibrasinya persis sama dan ClickHouse
ikut terisi:

```sql
-- 1. kembalikan penanda agar baris itu diproses lagi
UPDATE iot_log SET processed = false
 WHERE device_id = '<kode node>' AND label = 'telemetry'
   AND created_at BETWEEN '<awal lubang>' AND '<akhir lubang>';
```

```bash
# 2. picu pemrosesan di server (port gtw tidak terbuka dari luar)
curl -X POST "http://localhost:4000/telemetry-processor/process?limit=500"   # ulangi s/d habis
```

Endpoint itu memungut `iot_log` ber-`processed=false` (label `telemetry`, terlama dulu) lalu
melewatkannya ke jalur yang sama dengan data live — termasuk menulis ke ClickHouse.

Sebelum menjalankan, pastikan dua hal:
- `SELECT count(*) FROM iot_log WHERE label='telemetry' AND processed=false;` kecil — kalau besar,
  ada antrean lain yang ikut terproses.
- rentang yang mau dipulihkan memang **kosong** di `sensor_logs`, supaya tidak jadi dobel.

## Akar masalah — kenapa terus kambuh

Wizard pairing/remapping lama meng-assign **instance profil yang sama** ke banyak node. Perbaikan
permanennya sudah ada sejak Juli 2026: endpoint **`POST /api/nodes/{id}/assign-profile`**
(assign-atau-clone, transaksional) di branch `fix/pairing-profile-per-node`, dan frontend sudah
memanggilnya. **Tapi branch itu belum pernah di-deploy** — per 2 Okt 2026 endpointnya masih
`404` di produksi, sehingga FE jatuh ke jalur error dan profil tetap dibagi.

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  "https://iot-backend.helios.vito.devetek.com/api/nodes/<id>/assign-profile" \
  -H 'Content-Type: application/json' -d '{}'   # 401 = sudah ter-deploy, 404 = belum
```

Selama hasilnya masih 404, **jalankan kueri sapu secara berkala** — tiap selesai pairing/remapping,
atau minimal mingguan.

## Riwayat kejadian

| tanggal | kejadian |
|---|---|
| 24 Jul 2026 | profil dibagi 7 node (satu owner); endpoint assign-profile dibuat |
| 4 Sep 2026 | 2 node tanpa profil padahal profilnya ada (yatim) — ditautkan manual |
| 2 Okt 2026 | 1 profil dipakai **3 node milik 3 owner berbeda**; data WYDZI mati 2 hari, data 9VSIK mati sejak Juli. Plus 1 profil salah tunjuk (node cadangan) |

Lihat juga memory [[node-profile-per-node]] dan skill `clickhouse-backfill` (kalau lubangnya juga
sampai ke ClickHouse).
