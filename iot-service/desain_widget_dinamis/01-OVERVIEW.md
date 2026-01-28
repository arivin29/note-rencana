# 📋 01 - Overview & Goals

> **Document:** Overview & Goals  
> **Version:** 1.0.0  
> **Last Updated:** January 25, 2026

---

## 1.1 Executive Summary

### Background

Sistem IoT monitoring saat ini memiliki dashboard statis yang tidak dapat dikustomisasi oleh user. Untuk meningkatkan fleksibilitas dan user experience, diperlukan fitur **Dynamic Dashboard** yang memungkinkan user membuat dashboard sesuai kebutuhan mereka, mirip dengan ThingsBoard atau Grafana.

### Objective

Membangun sistem dashboard dinamis yang memungkinkan user untuk:
- Membuat dan mengelola multiple dashboards
- Menambahkan widgets dengan drag-and-drop
- Memilih data source dari sensor/node yang tersedia
- Melihat data secara real-time
- Menyimpan dan berbagi konfigurasi dashboard

---

## 1.2 Goals

### ✅ Primary Goals

| ID | Goal | Priority | Description |
|----|------|----------|-------------|
| G1 | Dynamic Dashboard CRUD | HIGH | User bisa create, read, update, delete dashboard |
| G2 | Flexible Widget System | HIGH | Drag-drop widgets dengan berbagai tipe visualisasi |
| G3 | Multi Data Source | HIGH | Pilih sensor/node mana saja sebagai data source |
| G4 | Real-time Updates | HIGH | Data update secara real-time via WebSocket |
| G5 | Responsive Layout | MEDIUM | Grid-based layout yang responsive di berbagai device |
| G6 | Dashboard Sharing | MEDIUM | Dashboard bisa di-share ke user lain |
| G7 | Templates | LOW | Admin bisa buat template untuk user baru |

### ✅ Success Criteria

1. User dapat membuat dashboard baru dalam < 5 menit
2. Widget dapat di-drag dan resize dengan smooth UX
3. Data real-time update dengan latency < 2 detik
4. Dashboard load time < 3 detik (dengan 10 widgets)
5. System dapat handle 100+ concurrent dashboard viewers

---

## 1.3 Non-Goals (Out of Scope - Phase 1)

| ID | Item | Reason | Future Phase |
|----|------|--------|--------------|
| NG1 | Advanced Query Builder | Complexity, fokus basic dulu | Phase 5 |
| NG2 | Custom Widget Development | User tidak perlu code | Phase 5+ |
| NG3 | Dashboard Versioning | Nice to have | Phase 5 |
| NG4 | Export to PDF/PNG | Nice to have | Phase 5 |
| NG5 | Embedded Dashboards | Complexity | Phase 6 |
| NG6 | Mobile App | Web-first approach | Future |
| NG7 | AI-based Anomaly Detection | Separate feature | Future |

---

## 1.4 Comparison with Existing Solutions

| Feature | ThingsBoard | Grafana | **Our Design** |
|---------|-------------|---------|----------------|
| Widget Types | 30+ | 20+ | 8-10 (start simple) |
| Data Source | Device Telemetry | Multiple DB | Node/Sensor Telemetry |
| Layout System | Grid | Grid | Grid (gridster-like) |
| Query Builder | Basic | Advanced | Medium |
| Real-time | Yes (WebSocket) | Yes (WebSocket) | Yes (WebSocket) |
| Alerting | Yes | Yes | Integrate existing |
| Templating | Yes | Yes | Phase 2 |
| Learning Curve | Medium | High | Low |
| Multi-tenant | Yes | Yes | Yes (existing) |

### Why Build Our Own?

1. **Integration** - Seamless integration dengan existing Node/Sensor/Owner system
2. **Simplicity** - Fokus pada use case IoT monitoring, tidak perlu fitur generic
3. **Control** - Full control over UX dan feature roadmap
4. **Cost** - Tidak perlu license fee untuk enterprise features
5. **Customization** - Bisa sesuaikan dengan business logic spesifik

---

## 1.5 Stakeholders

| Role | Responsibility | Contact |
|------|----------------|---------|
| Product Owner | Requirements, priorities | - |
| Tech Lead | Architecture decisions | - |
| Backend Dev | NestJS implementation | - |
| Frontend Dev | Angular implementation | - |
| QA | Testing strategy | - |

---

## 1.6 Constraints & Assumptions

### Constraints

1. **Tech Stack** - Harus menggunakan NestJS (backend) dan Angular (frontend) yang sudah ada
2. **Database** - PostgreSQL (existing)
3. **Timeline** - Target completion dalam 8-10 minggu
4. **Team Size** - 1-2 developers

### Assumptions

1. Existing authentication & authorization system akan digunakan
2. Existing Node/Sensor/Owner entities sudah stable
3. WebSocket infrastructure dapat ditambahkan ke NestJS
4. User sudah familiar dengan basic IoT monitoring concepts

---

## 1.7 Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Performance issues dengan banyak widget | High | Medium | Lazy loading, virtualization, caching |
| Complex drag-drop implementation | Medium | Medium | Gunakan library proven (angular-gridster2) |
| WebSocket scalability | High | Low | Implement proper connection management |
| Data query complexity | Medium | Medium | Start dengan simple queries, iterate |
| Browser compatibility | Low | Low | Focus on modern browsers |

---

## 1.8 Glossary

| Term | Definition |
|------|------------|
| **Dashboard** | Container untuk multiple widgets, dimiliki oleh Owner |
| **Widget** | Single visualization component (chart, gauge, table, etc.) |
| **Data Source** | Konfigurasi sumber data untuk widget (node, sensor, channel) |
| **Grid Layout** | Sistem layout berbasis grid untuk positioning widgets |
| **Channel** | Specific data point dalam sensor (e.g., temperature, humidity) |
| **Real-time** | Data update tanpa page refresh via WebSocket |

---

## Navigation

⬅️ [Back to Index](./00-INDEX.md) | [Next: User Stories](./02-USER-STORIES.md) ➡️
