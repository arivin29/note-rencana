# 01 - Project Workspace Overview

## Architecture Decision

### Why Router-based Navigation (Not Tabs)

| Approach | Tabs (Original) | Router (Final) |
|----------|-----------------|----------------|
| **Loading** | All data at once | Lazy per route |
| **Deep Linking** | Limited | Full URL support |
| **Maintenance** | Single large component | Separate modules |
| **Asset Tree** | Side panel | Full sidebar |
| **Performance** | Heavy initial load | On-demand |

### Final Architecture

```
┌────┬──────────────────┬─────────────────────────────────────────────┐
│ 📊 │ 🏭 Water Supply  │                                             │
│ 🛡️ │ ────────────────│                                             │
│ 🏗️ │ 📊 Overview     │          [Main Content Area]                │
│ 📦 │ ────────────────│          (router-outlet)                    │
│ 🖥️ │ 📦 Assets       │                                             │
│ ⚠️ │   ├─🟢 PDAM-01(3)│                                             │  
│ 📈 │   │  ├─ Pressure │                                             │
│ 🔧 │   │  ├─ Flow     │                                             │
│ 📖 │   │  └─ Level    │                                             │
│ 👥 │   ├─🔴 PDAM-02(2)│                                             │
│ 📝 │   └─🟡 PDAM-03(4)│                                             │
│ 👤 │ 📈 Monitor       │                                             │
│    │ 🗺️ Map          │                                             │
│    │ ⚙️ Config       │                                             │
└────┴──────────────────┴─────────────────────────────────────────────┘
 60px      ~240px                   Remaining width
 Main    Secondary                  Content
(mini)   Sidebar
```

---

## Current State Analysis

### Existing Features
- Project Snapshot (stats cards)
- Operations & Team section
- Map widget (nodes with GPS)
- Sensor overview table
- Alert summary
- Deep links navigation

### Pain Points
1. **Single scroll page** - Not efficient for large projects
2. **No real-time monitoring** - No live sensor values dashboard
3. **Map isolated** - Not integrated with node details
4. **No asset tree** - Can't browse nodes/sensors hierarchically
5. **Heavy load** - All data loads at once

---

## Goals

### Primary Goals
1. **Router-based navigation** with lazy loading
2. **Secondary sidebar** with asset tree (nodes → sensors)
3. **Status indicators** in tree (online/offline/warning)
4. **Main menu auto-collapse** for more content space
5. **Command Palette** (Ctrl+K) for power users
6. **Context Menu** (right-click) on assets

### Secondary Goals
1. Dynamic widget dashboard (Monitor page)
2. Enhanced map with node interaction
3. Analytics & historical reports

---

## Target Users

| Role | Primary Pages | Use Case |
|------|---------------|----------|
| **Operator** | Overview, Monitor | Daily health check, NOC screen |
| **Field Engineer** | Assets, Map | Troubleshooting, dispatch |
| **Manager** | Overview, Analytics | Reports, trends |
| **Admin** | Config | Project setup, permissions |

---

## UX Enhancements

### 1. Command Palette (Ctrl+K)
```
┌─────────────────────────────────────────────┐
│ 🔍 Search nodes, sensors, commands...       │
├─────────────────────────────────────────────┤
│ 📦 PDAM-01          Node · Water Supply     │
│ 📊 Pressure-001     Sensor · PDAM-01        │
│ ⚡ Restart Node     Command                  │
│ 📈 View Telemetry   Action                  │
└─────────────────────────────────────────────┘
```

### 2. Context Menu (Right-click / Hover)
```
Right-click on PDAM-01:
┌─────────────────────────┐
│ 📊 View Details         │
│ 📈 Open Telemetry       │
│ ─────────────────────── │
│ 🔧 Configure            │
│ 🔇 Mute Alerts          │
│ 📤 Export Data          │
│ ─────────────────────── │
│ 🔁 Restart Node         │
│ ⚡ Send SMS Command     │
└─────────────────────────┘
```

### 3. Status Indicators
```
🟢 Online    - All sensors active, data flowing
🟡 Warning   - Some sensors degraded or threshold breach
🔴 Offline   - Node disconnected
⚪ Unknown   - Never connected / no data
```

---

## Technical Stack

### Dependencies
- Angular Router (lazy loading)
- SharedComponentsModule
- Dynamic Widget Module (`desain_widget_dinamis`)
- Leaflet (map)
- ApexCharts (analytics)

### No New Backend Changes Required
- Uses existing nodes, sensors, projects APIs
- Status derived from `lastSeenAt` timestamp

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Initial page load | ~3s all data | < 1s skeleton |
| Navigate to node | Click list → new page | < 200ms route |
| Find specific sensor | Manual scroll | < 3s via tree/search |
| Mobile usability | Poor | Responsive sidebar |

---

**Next**: [02-WORKSPACE-LAYOUT.md](02-WORKSPACE-LAYOUT.md)
