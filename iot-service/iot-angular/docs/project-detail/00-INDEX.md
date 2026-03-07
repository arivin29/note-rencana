# Project Workspace Redesign

## 🎯 Key Design Decisions

1. **Router-based Navigation** (not tabs) - Lazy loading, deep linking
2. **Secondary Sidebar** - Asset tree with status indicators
3. **Main Menu Auto-Collapse** - Icon-only mode when in workspace
4. **Command Palette** - Ctrl+K quick search & actions
5. **Context Menu** - Right-click actions on assets

---

## Documentation Index

| # | Document | Description |
|---|----------|-------------|
| 01 | [OVERVIEW](01-OVERVIEW.md) | Project goals, architecture |
| 02 | [WORKSPACE-LAYOUT](02-WORKSPACE-LAYOUT.md) | Layout & sidebar design |
| 03 | [OVERVIEW-PAGE](03-OVERVIEW-PAGE.md) | Overview page specifications |
| 04 | [MONITOR-PAGE](04-MONITOR-PAGE.md) | Real-time monitoring |
| 05 | [ASSETS-PAGE](05-ASSETS-PAGE.md) | Asset management |
| 06 | [MAP-PAGE](06-MAP-PAGE.md) | Map view |
| 07 | [ANALYTICS-PAGE](07-ANALYTICS-PAGE.md) | Analytics & reports |
| 08 | [CONFIG-PAGE](08-CONFIG-PAGE.md) | Project settings |
| 09 | [COMMAND-PALETTE](09-COMMAND-PALETTE.md) | Quick search & actions |
| 10 | [CONTEXT-MENU](10-CONTEXT-MENU.md) | Right-click actions |
| 11 | [TASK-TRACKING](11-TASK-TRACKING.md) | Implementation progress |

---

## URL Structure

```
/iot/projects/:projectId                    → Redirect to overview
/iot/projects/:projectId/overview           → Dashboard summary
/iot/projects/:projectId/assets             → All nodes list
/iot/projects/:projectId/nodes/:nodeId      → Node detail
/iot/projects/:projectId/nodes/:nodeId/sensors/:sensorId → Sensor detail
/iot/projects/:projectId/monitor            → Real-time view
/iot/projects/:projectId/map                → Map view
/iot/projects/:projectId/analytics          → Charts & reports
/iot/projects/:projectId/config             → Settings
```

## Component Structure

```
projects/
├── project-workspace/                    ← Layout wrapper
│   ├── project-workspace.component.ts
│   ├── project-workspace.component.html
│   ├── project-sidebar/                  ← Secondary sidebar
│   │   └── project-sidebar.component.ts
│   └── project-workspace-routing.module.ts
├── project-overview/                     ← Child route
├── project-assets/                       ← Child route  
├── project-node-detail/                  ← Child route
├── project-sensor-detail/                ← Child route
├── project-monitor/                      ← Child route
├── project-map/                          ← Child route
├── project-analytics/                    ← Child route
└── project-config/                       ← Child route
```

---

**Last Updated**: March 7, 2026  
**Status**: Architecture Refined
