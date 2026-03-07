# WebGIS Design Review & Fixes

## Review Date: 2026-03-07
## Status: ✅ Design Validated

---

## 1. CLARIFIED ITEMS (Bukan Masalah)

### 1.1 ✅ FK Reference - `owners` & `projects`

**Status:** Sudah benar, tabel memang `owners` dan `projects` (plural). Tidak ada masalah.

---

### 1.2 ✅ SRID Issue - Core Layer vs Custom Layer

**Keputusan:**
- **Core layer (Sensor/Node):** Data kecil, tidak perlu PostGIS geometry - cukup `latitude/longitude` DECIMAL
- **Custom layer (User upload):** Pakai PostGIS geometry untuk spatial operations
- Generate GeoJSON dari `ST_MakePoint(longitude, latitude)` untuk core layer

**Impact:** Tidak ada migrasi existing tables diperlukan.

---

### 1.3 ✅ Section 2.1.B - Multi-Industry Dynamic Categories

**Status:** Sudah correct! Section 2.1.B sudah menampilkan:
- Kategori dinamis CRUD via API
- Multi-industry (Water Utility, Energy, Manufacturing, Agriculture, Smart Building)
- Template fields per kategori
- Multi-tenant support

---

## 2. FIXES APPLIED

### 2.1 ✅ layer_code UNIQUE Constraint

**Problem:** `layer_code VARCHAR(100) UNIQUE` akan clash antar project berbeda.

**Fix:** Hapus UNIQUE dari kolom, cukup pakai constraint `UNIQUE (id_project, layer_code)`.

---

### 2.2 ✅ Sensor Query - Join to Node

**Problem:** Query asumsi sensor punya geometry column (tidak ada).

**Fix:** Query join ke Node untuk dapat koordinat:
```sql
SELECT s.id_sensor, s.label, n.latitude, n.longitude,
       ST_SetSRID(ST_MakePoint(n.longitude, n.latitude), 4326) as geom
FROM sensors s
JOIN nodes n ON s.id_node = n.id_node
WHERE n.id_project = $1
```

---

### 2.3 ✅ TypeORM Entity Definitions

**Status:** Sudah ditambahkan di Appendix C (MapLayer, MapLayerFeature, MapLayerCategory, SpatialUploadFile).

---

### 2.4 ✅ PostgreSQL Version Requirements

**Status:** Sudah ditambahkan di Appendix D (PostgreSQL 12+ with PostGIS 3.0+).

---

## 3. OPTIONAL ENHANCEMENTS (Future)

### 3.1 Upload File Cleanup
- Scheduled job cleanup upload > 7 hari dengan status != completed
- Optional: Delete file setelah publish

### 3.2 Industry Reference Table
- Tambah enum atau tabel `map_industries` untuk referential integrity
- Saat ini pakai string validation di frontend/backend

### 3.3 Layer Permissions
```sql
visibility VARCHAR(20) DEFAULT 'private' 
  CHECK (visibility IN ('private', 'project', 'owner', 'public'))
```

### 3.4 API Authorization
- `GET /layers` - Any authenticated user
- `POST /upload` - Editor/Admin
- `DELETE /layers/:id` - Owner atau Admin
- `POST /categories` - Admin only

### 3.5 Audit Trail
- Tambah `map_layer_audit` table atau PostgreSQL audit trigger

---

## 4. SUMMARY

| # | Item | Status |
|---|------|--------|
| 1 | FK References (owners, projects) | ✅ Correct |
| 2 | Core layer tanpa PostGIS | ✅ By design |
| 3 | Section 2.1.B multi-industry | ✅ Correct |
| 4 | layer_code UNIQUE constraint | ✅ Fixed |
| 5 | Sensor query join Node | ✅ Fixed |
| 6 | TypeORM entities | ✅ Added (Appendix C) |
| 7 | PostgreSQL requirements | ✅ Added (Appendix D) |
| 8 | Upload cleanup | 📋 Future |
| 9 | Layer permissions | 📋 Future |
| 10 | Audit trail | 📋 Future |

---

**Conclusion:** Design document siap untuk implementasi. Semua critical issues sudah diperbaiki.

