# 19. Task Tracking - Dynamic Widget System

> **Master task list untuk implementasi Dynamic Widget System**  
> **Last Updated**: 25 January 2026

---

## 📊 Progress Overview

| Phase | Status | Progress | Target |
|-------|--------|----------|--------|
| Phase 0: Setup | 🟡 In Progress | 0% | Week 1 |
| Phase 1A: Basic Widget | ⚪ Not Started | 0% | Week 2-3 |
| Phase 1B: More Charts | ⚪ Not Started | 0% | Week 4 |
| Phase 1C: Global Filter | ⚪ Not Started | 0% | Week 5 |
| Phase 2: Visual Builder | ⚪ Not Started | 0% | Week 6-8 |
| Phase 3: Advanced | ⚪ Not Started | 0% | Week 9-12 |

**Legend**: ⚪ Not Started | 🟡 In Progress | 🟢 Complete | 🔴 Blocked

---

## 🎯 Phase 0: Project Setup (Week 1)

### 0.1 Library Installation
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 0.1.1 | Install frontend libraries (echarts, ngx-echarts, gridster2) | - | ⚪ | See doc 18 |
| 0.1.2 | Install frontend libraries (codemirror, socket.io-client) | - | ⚪ | See doc 18 |
| 0.1.3 | Install backend libraries (websockets, socket.io) | - | ⚪ | See doc 18 |
| 0.1.4 | Verify all libraries installed correctly | - | ⚪ | Run npm ls |

### 0.2 Database Setup
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 0.2.1 | Create migration for `dashboards` table | - | ⚪ | See doc 04 |
| 0.2.2 | Create migration for `widgets` table | - | ⚪ | See doc 04 |
| 0.2.3 | Create migration for `widget_queries` table | - | ⚪ | See doc 04 |
| 0.2.4 | Run migrations on dev database | - | ⚪ | npm run migration:run |
| 0.2.5 | Create seed data for testing | - | ⚪ | Sample dashboard |

### 0.3 Module Structure
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 0.3.1 | Create backend module: `src/modules/dashboards/` | - | ⚪ | NestJS module |
| 0.3.2 | Create backend module: `src/modules/widgets/` | - | ⚪ | NestJS module |
| 0.3.3 | Create frontend module: `src/app/pages/widget-builder/` | - | ⚪ | Angular module |
| 0.3.4 | Setup routing for widget builder | - | ⚪ | Lazy loaded |

---

## 🎯 Phase 1A: Basic Widget System (Week 2-3)

### 1A.1 Backend - Dashboard CRUD
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 1A.1.1 | Create Dashboard entity | - | ⚪ | TypeORM entity |
| 1A.1.2 | Create Dashboard DTOs (create, update, response) | - | ⚪ | class-validator |
| 1A.1.3 | Create DashboardService | - | ⚪ | CRUD operations |
| 1A.1.4 | Create DashboardController | - | ⚪ | REST endpoints |
| 1A.1.5 | Add owner filtering for multi-tenant | - | ⚪ | Security |
| 1A.1.6 | Add Swagger documentation | - | ⚪ | @ApiTags |
| 1A.1.7 | Write unit tests | - | ⚪ | Jest |

### 1A.2 Backend - Widget CRUD
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 1A.2.1 | Create Widget entity | - | ⚪ | TypeORM entity |
| 1A.2.2 | Create Widget DTOs | - | ⚪ | class-validator |
| 1A.2.3 | Create WidgetService | - | ⚪ | CRUD + position update |
| 1A.2.4 | Create WidgetController | - | ⚪ | REST endpoints |
| 1A.2.5 | Add widget position batch update | - | ⚪ | For drag-drop save |
| 1A.2.6 | Write unit tests | - | ⚪ | Jest |

### 1A.3 Backend - Query Execution
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 1A.3.1 | Create QueryExecutionService | - | ⚪ | Execute SQL |
| 1A.3.2 | Implement SQL validation (SELECT only) | - | ⚪ | Security |
| 1A.3.3 | Implement table whitelist | - | ⚪ | Security |
| 1A.3.4 | Implement owner filter injection | - | ⚪ | Multi-tenant |
| 1A.3.5 | Implement variable substitution (${__timeFrom}) | - | ⚪ | Time filter |
| 1A.3.6 | Create QueryController (POST /api/query/execute) | - | ⚪ | REST endpoint |
| 1A.3.7 | Add query timeout (30s max) | - | ⚪ | Performance |
| 1A.3.8 | Write unit tests | - | ⚪ | Jest |

### 1A.4 Frontend - Dashboard List
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 1A.4.1 | Create dashboard-list component | - | ⚪ | List view |
| 1A.4.2 | Create dashboard-card component | - | ⚪ | Card UI |
| 1A.4.3 | Implement create dashboard modal | - | ⚪ | Angular Material |
| 1A.4.4 | Implement edit dashboard modal | - | ⚪ | Angular Material |
| 1A.4.5 | Implement delete confirmation | - | ⚪ | Angular Material |
| 1A.4.6 | Create DashboardService (API calls) | - | ⚪ | HttpClient |

### 1A.5 Frontend - Dashboard View
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 1A.5.1 | Create dashboard-view component | - | ⚪ | Main view |
| 1A.5.2 | Integrate angular-gridster2 | - | ⚪ | Grid layout |
| 1A.5.3 | Implement widget drag-drop | - | ⚪ | Gridster |
| 1A.5.4 | Implement widget resize | - | ⚪ | Gridster |
| 1A.5.5 | Implement position save | - | ⚪ | API call |
| 1A.5.6 | Add "Add Widget" button | - | ⚪ | Opens wizard |

### 1A.6 Frontend - Widget Wizard (SQL Mode)
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 1A.6.1 | Create widget-wizard component | - | ⚪ | Multi-step |
| 1A.6.2 | Step 1: Basic info (name, type) | - | ⚪ | Form |
| 1A.6.3 | Step 2: SQL Editor with codemirror | - | ⚪ | SQL input |
| 1A.6.4 | Implement "Test Query" button | - | ⚪ | Preview results |
| 1A.6.5 | Step 3: Field mapping (x, y, label) | - | ⚪ | Map columns to chart |
| 1A.6.6 | Step 4: Chart preview | - | ⚪ | ECharts preview |
| 1A.6.7 | Save widget to API | - | ⚪ | POST request |

### 1A.7 Frontend - Widget Renderer
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 1A.7.1 | Create widget-container component | - | ⚪ | Wrapper |
| 1A.7.2 | Create line-chart widget | - | ⚪ | ECharts line |
| 1A.7.3 | Create WidgetDataService | - | ⚪ | Fetch & transform |
| 1A.7.4 | Implement widget loading state | - | ⚪ | Spinner |
| 1A.7.5 | Implement widget error state | - | ⚪ | Error message |
| 1A.7.6 | Add widget toolbar (edit, delete, refresh) | - | ⚪ | Actions |

---

## 🎯 Phase 1B: More Chart Types (Week 4)

### 1B.1 Additional Widgets
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 1B.1.1 | Create bar-chart widget | - | ⚪ | ECharts bar |
| 1B.1.2 | Create gauge widget | - | ⚪ | ECharts gauge |
| 1B.1.3 | Create pie-chart widget | - | ⚪ | ECharts pie |
| 1B.1.4 | Create value-card widget | - | ⚪ | Single value |
| 1B.1.5 | Create data-table widget | - | ⚪ | Tabular data |
| 1B.1.6 | Update widget wizard for new types | - | ⚪ | Type selection |

### 1B.2 Chart Customization
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 1B.2.1 | Add color theme options | - | ⚪ | Chart colors |
| 1B.2.2 | Add title/subtitle config | - | ⚪ | Chart header |
| 1B.2.3 | Add legend toggle | - | ⚪ | Show/hide legend |
| 1B.2.4 | Add axis label config | - | ⚪ | X/Y labels |

---

## 🎯 Phase 1C: Global Time Filter (Week 5)

### 1C.1 Time Filter Component
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 1C.1.1 | Create time-range-picker component | - | ⚪ | Like Grafana |
| 1C.1.2 | Implement quick ranges (1h, 6h, 24h, 7d) | - | ⚪ | Presets |
| 1C.1.3 | Implement custom date range | - | ⚪ | Date picker |
| 1C.1.4 | Create TimeFilterService | - | ⚪ | State management |
| 1C.1.5 | Broadcast time change to all widgets | - | ⚪ | Observable |

### 1C.2 Auto Refresh
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 1C.2.1 | Add refresh interval selector | - | ⚪ | 5s, 10s, 30s, 1m, 5m |
| 1C.2.2 | Implement auto-refresh timer | - | ⚪ | RxJS interval |
| 1C.2.3 | Show last updated timestamp | - | ⚪ | UI indicator |

---

## 🎯 Phase 2: Visual Query Builder (Week 6-8)

### 2.1 Cascading Dropdown Builder
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 2.1.1 | Create visual-query-builder component | - | ⚪ | Alternative to SQL |
| 2.1.2 | Owner dropdown (for admin) | - | ⚪ | First level |
| 2.1.3 | Project dropdown (filtered by owner) | - | ⚪ | Second level |
| 2.1.4 | Node dropdown (filtered by project) | - | ⚪ | Third level |
| 2.1.5 | Sensor dropdown (filtered by node) | - | ⚪ | Fourth level |
| 2.1.6 | Channel dropdown (filtered by sensor) | - | ⚪ | Fifth level |
| 2.1.7 | Generate SQL from selection | - | ⚪ | SQL builder |

### 2.2 Query Templates
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 2.2.1 | Create query template system | - | ⚪ | Reusable queries |
| 2.2.2 | Template: Sensor time series | - | ⚪ | Common pattern |
| 2.2.3 | Template: Aggregation by hour | - | ⚪ | Common pattern |
| 2.2.4 | Template: Compare sensors | - | ⚪ | Common pattern |
| 2.2.5 | Template: Node health | - | ⚪ | Common pattern |

---

## 🎯 Phase 3: Advanced Features (Week 9-12)

### 3.1 Real-time Updates
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 3.1.1 | Setup WebSocket gateway | - | ⚪ | NestJS |
| 3.1.2 | Create subscription system | - | ⚪ | Per widget |
| 3.1.3 | Implement streaming updates | - | ⚪ | Push data |
| 3.1.4 | Handle reconnection | - | ⚪ | Resilience |

### 3.2 Dashboard Sharing
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 3.2.1 | Dashboard visibility (private/shared/public) | - | ⚪ | Access control |
| 3.2.2 | Share link generation | - | ⚪ | Unique URL |
| 3.2.3 | Clone dashboard | - | ⚪ | Copy feature |

### 3.3 Export Features
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 3.3.1 | Export widget data to CSV | - | ⚪ | Download |
| 3.3.2 | Export chart as PNG | - | ⚪ | Image export |
| 3.3.3 | Export dashboard config | - | ⚪ | JSON export |

### 3.4 Additional Charts
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 3.4.1 | Heatmap widget | - | ⚪ | Time heatmap |
| 3.4.2 | Area chart widget | - | ⚪ | Stacked area |
| 3.4.3 | Scatter plot widget | - | ⚪ | Correlation |
| 3.4.4 | Radar chart widget | - | ⚪ | Multi-dimension |

---

## 📝 Task Status Legend

| Status | Meaning |
|--------|---------|
| ⚪ | Not Started |
| 🟡 | In Progress |
| 🟢 | Complete |
| 🔴 | Blocked |
| ⏸️ | On Hold |

---

## 📅 Timeline Summary

```
Week 1:  [Phase 0] Setup & Libraries
Week 2:  [Phase 1A] Backend CRUD
Week 3:  [Phase 1A] Frontend Widget Wizard
Week 4:  [Phase 1B] More Chart Types
Week 5:  [Phase 1C] Global Time Filter
Week 6-8: [Phase 2] Visual Query Builder
Week 9-12: [Phase 3] Advanced Features
```

---

## 🔗 Related Documents

| Doc | Link | Description |
|-----|------|-------------|
| 04 | [Database Design](./04-DATABASE-DESIGN.md) | Table schemas |
| 05 | [Backend Architecture](./05-BACKEND-ARCHITECTURE.md) | Module structure |
| 06 | [Frontend Architecture](./06-FRONTEND-ARCHITECTURE.md) | Component structure |
| 08 | [API Specification](./08-API-SPECIFICATION.md) | REST endpoints |
| 17 | [SQL Query Builder](./17-SQL-QUERY-BUILDER.md) | SQL approach |
| 18 | [Library Requirements](./18-LIBRARY-REQUIREMENTS.md) | Dependencies |

---

## 📊 Daily Standup Template

```markdown
## Standup - [DATE]

### Yesterday
- [ ] Task completed

### Today
- [ ] Task planned

### Blockers
- None / List blockers
```

---

**Maintained by**: Development Team  
**Review Frequency**: Daily
