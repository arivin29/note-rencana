# 📋 11 - Implementation Phases

> **Document:** Implementation Roadmap & Tasks  
> **Version:** 1.0.0  
> **Last Updated:** January 25, 2026

---

## 11.1 Phase Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        IMPLEMENTATION TIMELINE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Week 1-2        Week 3-4        Week 5-6        Week 7-8        Week 9+    │
│  ────────        ────────        ────────        ────────        ──────     │
│                                                                              │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐  │
│  │ Phase 1 │───►│ Phase 2 │───►│ Phase 3 │───►│ Phase 4 │───►│ Phase 5 │  │
│  │Foundation│    │ Widget  │    │  Data   │    │Realtime │    │Advanced │  │
│  │         │    │ System  │    │ & Config│    │         │    │Features │  │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘  │
│                                                                              │
│  Deliverable:   Deliverable:   Deliverable:   Deliverable:   Deliverable:  │
│  Basic CRUD     Drag-drop      Full config    Live updates   Sharing,      │
│  Empty canvas   4 widgets      Data sources   WebSocket      Templates     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 11.2 Phase 1: Foundation (Week 1-2)

### Goals
- Database schema & migrations
- Basic Dashboard CRUD
- Basic Widget CRUD
- Empty canvas with grid

### Backend Tasks

| Task | Priority | Est. Hours | Status |
|------|----------|------------|--------|
| Create database migrations | HIGH | 2 | [ ] |
| Create Dashboard entity | HIGH | 2 | [ ] |
| Create Widget entity | HIGH | 2 | [ ] |
| Create DashboardShare entity | MEDIUM | 1 | [ ] |
| Create Dashboards module | HIGH | 4 | [ ] |
| Create Widgets module | HIGH | 4 | [ ] |
| Dashboard CRUD endpoints | HIGH | 4 | [ ] |
| Widget CRUD endpoints | HIGH | 4 | [ ] |
| Bulk update positions endpoint | HIGH | 2 | [ ] |
| Basic authorization guards | HIGH | 3 | [ ] |
| Swagger documentation | MEDIUM | 2 | [ ] |

**Backend Subtotal: ~30 hours**

### Frontend Tasks

| Task | Priority | Est. Hours | Status |
|------|----------|------------|--------|
| Create dynamic-dashboards module | HIGH | 2 | [ ] |
| Setup routing | HIGH | 1 | [ ] |
| Install dependencies (gridster2, echarts) | HIGH | 1 | [ ] |
| Create DashboardStateService | HIGH | 4 | [ ] |
| Create dashboard-list page | HIGH | 6 | [ ] |
| Create dashboard-editor page (basic) | HIGH | 6 | [ ] |
| Create dashboard-canvas component | HIGH | 6 | [ ] |
| Create widget-wrapper component | HIGH | 4 | [ ] |
| Integrate with SDK (regenerate) | HIGH | 2 | [ ] |
| Basic styling | MEDIUM | 4 | [ ] |

**Frontend Subtotal: ~36 hours**

### Definition of Done - Phase 1
- [ ] User can create a new dashboard
- [ ] User can see list of dashboards
- [ ] User can open dashboard editor
- [ ] Empty grid canvas is displayed
- [ ] User can save dashboard (name, description)
- [ ] User can delete dashboard

---

## 11.3 Phase 2: Widget System (Week 3-4)

### Goals
- Widget library panel
- Drag-drop widget placement
- Implement 4 basic widgets
- Widget configuration basics

### Backend Tasks

| Task | Priority | Est. Hours | Status |
|------|----------|------------|--------|
| Create widget-data module | HIGH | 2 | [ ] |
| Create SensorDataProvider | HIGH | 6 | [ ] |
| Create NodeStatusProvider | MEDIUM | 4 | [ ] |
| Create AggregationProvider | MEDIUM | 4 | [ ] |
| Widget data endpoint | HIGH | 4 | [ ] |
| Preview data endpoint | MEDIUM | 2 | [ ] |

**Backend Subtotal: ~22 hours**

### Frontend Tasks

| Task | Priority | Est. Hours | Status |
|------|----------|------------|--------|
| Create WidgetRegistryService | HIGH | 4 | [ ] |
| Create WidgetDataService | HIGH | 4 | [ ] |
| Create widget-library-panel | HIGH | 6 | [ ] |
| Create widget-toolbar | HIGH | 4 | [ ] |
| Create widget-config-modal (basic) | HIGH | 6 | [ ] |
| Create BaseWidgetComponent | HIGH | 4 | [ ] |
| Implement Line Chart widget | HIGH | 8 | [ ] |
| Implement Gauge widget | HIGH | 6 | [ ] |
| Implement Single Value widget | HIGH | 4 | [ ] |
| Implement Status Indicator widget | HIGH | 4 | [ ] |
| Widget config components (4 widgets) | HIGH | 8 | [ ] |
| Drag-drop from library | HIGH | 4 | [ ] |
| Widget resize/move | HIGH | 4 | [ ] |

**Frontend Subtotal: ~66 hours**

### Definition of Done - Phase 2
- [ ] Widget library panel shows 4 widget types
- [ ] User can drag widget from library to canvas
- [ ] Widgets can be moved and resized
- [ ] User can configure widget (basic options)
- [ ] Line Chart displays static/sample data
- [ ] Gauge displays static/sample data
- [ ] Single Value displays static/sample data
- [ ] Status Indicator displays static/sample data

---

## 11.4 Phase 3: Data Source & Config (Week 5-6)

### Goals
- Full data source selector
- Complete widget configurations
- Time range picker
- Data fetching for widgets

### Backend Tasks

| Task | Priority | Est. Hours | Status |
|------|----------|------------|--------|
| Data sources helper endpoints | HIGH | 4 | [ ] |
| Time range query support | HIGH | 4 | [ ] |
| Aggregation options | HIGH | 4 | [ ] |
| Query caching (Redis) | MEDIUM | 4 | [ ] |
| Optimize data queries | MEDIUM | 4 | [ ] |

**Backend Subtotal: ~20 hours**

### Frontend Tasks

| Task | Priority | Est. Hours | Status |
|------|----------|------------|--------|
| Create DataSourceSelector component | HIGH | 8 | [ ] |
| Node/Sensor cascading select | HIGH | 6 | [ ] |
| Channel selector | HIGH | 4 | [ ] |
| Create TimeRangePicker | HIGH | 6 | [ ] |
| Complete widget config forms | HIGH | 12 | [ ] |
| Color picker integration | MEDIUM | 2 | [ ] |
| Threshold configuration UI | MEDIUM | 4 | [ ] |
| Live preview in config modal | MEDIUM | 4 | [ ] |
| Connect widgets to real data | HIGH | 6 | [ ] |
| Dashboard header with time range | HIGH | 4 | [ ] |

**Frontend Subtotal: ~56 hours**

### Definition of Done - Phase 3
- [ ] User can select Node → Sensor → Channel
- [ ] User can set aggregation (avg, min, max, etc.)
- [ ] User can set time range (presets + custom)
- [ ] Widgets fetch and display real data
- [ ] All 4 widgets fully configurable
- [ ] Dashboard global time range works

---

## 11.5 Phase 4: Real-time Updates (Week 7-8)

### Goals
- WebSocket integration
- Real-time widget updates
- Dashboard viewer mode
- Additional widgets

### Backend Tasks

| Task | Priority | Est. Hours | Status |
|------|----------|------------|--------|
| Create realtime module | HIGH | 2 | [ ] |
| Implement RealtimeGateway | HIGH | 8 | [ ] |
| Implement SubscriptionService | HIGH | 6 | [ ] |
| Implement BroadcastService | HIGH | 4 | [ ] |
| Connect to IoT Gateway events | HIGH | 6 | [ ] |
| WebSocket authentication | HIGH | 4 | [ ] |
| Connection management | MEDIUM | 4 | [ ] |

**Backend Subtotal: ~34 hours**

### Frontend Tasks

| Task | Priority | Est. Hours | Status |
|------|----------|------------|--------|
| Create DashboardRealtimeService | HIGH | 8 | [ ] |
| WebSocket connection management | HIGH | 4 | [ ] |
| Update BaseWidget for realtime | HIGH | 4 | [ ] |
| Connection status indicator | MEDIUM | 2 | [ ] |
| Create dashboard-viewer page | HIGH | 6 | [ ] |
| Auto-refresh fallback | MEDIUM | 2 | [ ] |
| Implement Table widget | HIGH | 8 | [ ] |
| Implement Bar Chart widget | MEDIUM | 6 | [ ] |
| Implement Pie Chart widget | MEDIUM | 6 | [ ] |

**Frontend Subtotal: ~46 hours**

### Definition of Done - Phase 4
- [ ] WebSocket connection established on dashboard open
- [ ] Widgets update in real-time when new data arrives
- [ ] Connection status visible to user
- [ ] Graceful reconnection on disconnect
- [ ] Viewer mode (read-only) works
- [ ] 7 widgets total available

---

## 11.6 Phase 5: Advanced Features (Week 9+)

### Goals
- Dashboard sharing
- Templates
- Export/Import
- Polish & optimization

### Tasks

| Task | Priority | Est. Hours | Status |
|------|----------|------------|--------|
| Dashboard sharing UI | MEDIUM | 8 | [ ] |
| Share permission management | MEDIUM | 6 | [ ] |
| Template creation (admin) | LOW | 6 | [ ] |
| Create from template | LOW | 4 | [ ] |
| Duplicate dashboard | LOW | 2 | [ ] |
| Dashboard settings modal | MEDIUM | 4 | [ ] |
| Export dashboard (JSON) | LOW | 4 | [ ] |
| Import dashboard | LOW | 4 | [ ] |
| Performance optimization | MEDIUM | 8 | [ ] |
| Map widget | LOW | 12 | [ ] |
| Error handling improvements | MEDIUM | 4 | [ ] |
| Loading states polish | MEDIUM | 4 | [ ] |
| Responsive design | MEDIUM | 6 | [ ] |
| Documentation | MEDIUM | 8 | [ ] |

**Phase 5 Subtotal: ~80 hours**

---

## 11.7 Task Breakdown Template

### For Each Task

```markdown
## Task: [Task Name]

**Phase:** X
**Priority:** HIGH | MEDIUM | LOW
**Estimated Hours:** X
**Assigned To:** [Name]
**Status:** [ ] Not Started | [ ] In Progress | [ ] Review | [x] Done

### Description
Brief description of the task.

### Acceptance Criteria
- [ ] Criteria 1
- [ ] Criteria 2
- [ ] Criteria 3

### Technical Notes
Any technical considerations or approach notes.

### Files to Create/Modify
- `path/to/file1.ts`
- `path/to/file2.ts`

### Dependencies
- Depends on Task X
- Depends on Task Y

### Test Cases
- Test case 1
- Test case 2
```

---

## 11.8 Estimation Summary

| Phase | Backend | Frontend | Total | Weeks |
|-------|---------|----------|-------|-------|
| Phase 1: Foundation | 30h | 36h | 66h | 2 |
| Phase 2: Widget System | 22h | 66h | 88h | 2 |
| Phase 3: Data & Config | 20h | 56h | 76h | 2 |
| Phase 4: Real-time | 34h | 46h | 80h | 2 |
| Phase 5: Advanced | 40h | 40h | 80h | 2+ |
| **Total** | **146h** | **244h** | **390h** | **10** |

*Assumptions: 1 developer, ~40 hours/week*

---

## 11.9 Risk Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Gridster2 compatibility issues | Medium | Low | Test early, have fallback plan |
| ECharts learning curve | Low | Medium | Use simple charts first |
| WebSocket complexity | High | Medium | Start with polling, add WS later |
| Performance with many widgets | Medium | Medium | Implement lazy loading, virtualization |
| Data query complexity | Medium | Medium | Start simple, optimize incrementally |

---

## 11.10 Definition of Done (Global)

Before marking any phase complete:

- [ ] All tasks completed
- [ ] Code reviewed
- [ ] Unit tests written (>70% coverage)
- [ ] Integration tests passing
- [ ] No critical bugs
- [ ] Documentation updated
- [ ] Swagger specs updated
- [ ] SDK regenerated
- [ ] Deployed to staging
- [ ] QA sign-off

---

## 11.11 Progress Tracking

```
Phase 1: Foundation
████████████████████ 0%  [ ] Not Started

Phase 2: Widget System  
████████████████████ 0%  [ ] Not Started

Phase 3: Data & Config
████████████████████ 0%  [ ] Not Started

Phase 4: Real-time
████████████████████ 0%  [ ] Not Started

Phase 5: Advanced
████████████████████ 0%  [ ] Not Started

Overall Progress: 0%
```

---

## Navigation

⬅️ [Previous: Security](./10-SECURITY.md) | [Back to Index](./00-INDEX.md) | [Next: Testing Strategy](./12-TESTING-STRATEGY.md) ➡️
