# BUG — Config RS485 ke device dobel & memuat sensor nonaktif

**Status:** temuan, BELUM diperbaiki (4 Sep 2026). Tidak ada data produksi yang diubah saat investigasi.
**Berkas:** `src/modules/mqtt/mqtt.service.ts` → `getRS485ConfigFromDatabase()` (± baris 720)
**Alur terkait:** device publish `get_config/{device_id}` → gtw balas `stream_config/{device_id}`

---

## 1. Gejala

Device `DEMO1-PORT12EF5D8C` menerima **dua blok RS485 identik** (`modbus_address: 2`,
katalog TUF-2000M, 9 register sama persis) padahal di halaman node hanya tampak
2 sensor dan cuma 1 yang RS485.

Contoh log: `stream_config/DEMO1-PORT12EF5D8C`, log id `bbbfa077-4cf0-4fc1-a988-61b0639f84a4`,
4 Sep 2026 20.54.46 — `rs485.devices[]` berisi `sensor_label: "TUF"` dan `sensor_label: "Tuf-2000"`.

## 2. Penyebab

Node itu sebenarnya punya 3 sensor di DB:

| sensor | id | status | katalog | modbus addr |
|---|---|---|---|---|
| tekanan | `4562e0b0` | active | FMB130 (tanpa `registers`) | – |
| TUF | `e773faae` | **inactive** | TUF-2000M | 2 |
| Tuf-2000 | `6f1d731f` | active | TUF-2000M | 2 |

- **API dashboard menyaring sensor nonaktif** — `iot-backend-go/app/services/node/node_service.go`
  (`getSensorsWithLatestData`): `WHERE s.id_node = ? AND s.status IS DISTINCT FROM 'inactive'`.
  Karena itu UI hanya menampilkan 2 sensor.
- **gtw tidak menyaring apa pun**:

  ```ts
  const sensors = await this.sensorRepository.find({ where: { idNode } });
  ```

  Semua sensor yang katalognya punya `default_channels_json` ikut dikirim. Sensor `tekanan`
  tidak ikut hanya karena katalog FMB130 tak punya `registers`.

## 3. Dua cacat yang terpisah

1. **Tidak memfilter `status`** — sensor yang sudah dinonaktifkan tetap disuruh di-polling
   oleh alat. Perilakunya beda dengan API dashboard: di UI sensor sudah hilang, di alat masih hidup.
2. **Tidak dedupe `modbus_address`** — dua sensor dengan alamat slave sama menghasilkan dua blok
   identik, sehingga alat polling slave yang sama **dua kali tiap scan** (boros waktu bus RS485;
   pada 9600 baud dengan 9 register ini terasa). Payload keluaran tetap satu blok `rs485_addr_2`,
   jadi gejalanya tidak kelihatan di data — hanya boros dan membingungkan.

## 4. Sebaran di produksi (sweep 4 Sep 2026)

Node dengan >1 sensor RS485 di alamat modbus sama:

| node | addr | sensor |
|---|---|---|
| `DEMO1-PORT12EF5D8C` | 2 | Tuf-2000 [active], TUF [inactive] |
| `MKR-AL-E03` | 1 | Sensor-2-MKR-AL-E03 [active], Sensor-3-MKR-AL-E03 [active] |

`MKR-AL-E03` murni kasus dedupe (dua-duanya aktif), tanpa unsur status.
Sensor RS485 berstatus nonaktif di seluruh DB: hanya 1 (TUF di node DEMO1 di atas).

## 5. Temuan sampingan — stempel `updated_at` config

Config yang dikirim memakai `updated_at: node.updatedAt` (di contoh: `2026-06-29`), padahal isi
config berasal dari `sensor_catalogs.default_channels_json`. Saat register 221 (Pipe Inner Diameter)
ditambahkan ke katalog TUF-2000M pada 4 Sep 2026, stempel ini **tidak ikut berubah**.

Kali ini tidak berdampak karena firmware menerapkan config tanpa membandingkan stempel. Tapi kalau
kelak firmware dibuat "lewati bila `updated_at` sama", perubahan katalog akan diam-diam tidak terpakai.

## 6. Rencana perbaikan (belum dikerjakan)

Di `getRS485ConfigFromDatabase()`:

1. Filter sensor nonaktif agar sejalan dengan API dashboard (`status <> 'inactive'`).
2. Dedupe per `modbus_address`: bila bentrok, pakai sensor aktif terbaru dan **log peringatan**
   supaya duplikat sensornya ketahuan operator.
3. (opsional) `updated_at` config = `max(node.updated_at, catalog.updated_at)`.

Catatan: perbaikan baru berefek setelah **iot-gtw di-deploy**, dan alat mengambil config baru
saat boot / request `get_config` berikutnya.

## 7. Bersih-bersih data (terpisah, butuh persetujuan)

Sensor **TUF `e773faae`** di node `DEMO1-PORT12EF5D8C` adalah duplikat: mapping node profile
sudah tidak memuatnya lagi, jadi 3 channel-nya tidak akan pernah terisi. Layak dihapus supaya
tidak menyisakan channel yatim. `MKR-AL-E03` perlu dicek dulu — apakah memang dua alat fisik
berbeda yang salah diberi alamat sama, atau duplikat entri.
