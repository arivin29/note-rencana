# 08 - Config Tab

## Purpose
Project configuration and settings management. Admin-only access.

---

## Status: Phase 3 (Placeholder)

This tab will be implemented in Phase 3. For now, link to existing project edit page.

---

## Planned Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CONFIGURATION                                                  [Save All]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  PROJECT INFO                                              [Edit]   │   │
│  │                                                                      │   │
│  │  Name: DMA 1                                                         │   │
│  │  Owner: PDAM KUTKAR                                                  │   │
│  │  Area Type: Pipeline                                                 │   │
│  │  Status: Active                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  DATA SETTINGS                                                       │   │
│  │                                                                      │   │
│  │  Telemetry Retention: [30 days ▼]                                    │   │
│  │  Aggregation Interval: [10 minutes ▼]                                │   │
│  │  Auto-refresh Rate: [10 seconds ▼]                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ALERT RULES                                                         │   │
│  │                                                                      │   │
│  │  Default Escalation SLO: [30 minutes ▼]                              │   │
│  │  Notification Channels: [Slack, Email]                               │   │
│  │  [Manage Alert Rules →]                                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  TEAM & ACCESS                                                       │   │
│  │                                                                      │   │
│  │  Project Owner: Arif Pratama      [Change]                           │   │
│  │  Field Engineers: 3 assigned      [Manage]                           │   │
│  │  Viewers: 5 users                 [Manage]                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  DANGER ZONE                                                         │   │
│  │                                                                      │   │
│  │  [Archive Project]  [Transfer Ownership]  [Delete Project]          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Sections

### 1. Project Info
- Basic project metadata
- Links to full edit page

### 2. Data Settings
- Telemetry retention period
- Aggregation settings
- Refresh rates

### 3. Alert Rules
- Default thresholds
- Escalation SLO
- Notification channels

### 4. Team & Access
- Role management
- User assignments

### 5. Dashboard Config
- Monitor tab layout
- Widget positions
- Default view settings

### 6. Danger Zone
- Archive/Delete project
- Transfer ownership

---

## Access Control

```typescript
// Only show Config tab for authorized users
canAccessConfig(): boolean {
  return this.authService.hasPermission('project:admin') ||
         this.authService.isProjectOwner(this.projectId);
}
```

---

## Placeholder Implementation

```typescript
@Component({
  selector: 'app-config-tab',
  template: `
    <div class="config-placeholder">
      <div class="alert alert-info">
        <i class="fa fa-info-circle me-2"></i>
        Project configuration is managed from the Project Edit page.
      </div>
      <a [routerLink]="['/iot/projects', projectId, 'edit']" class="btn btn-primary">
        <i class="fa fa-edit me-1"></i> Edit Project
      </a>
    </div>
  `
})
export class ConfigTabComponent {
  @Input() projectId: string;
}
```

---

**Prev**: [07-ANALYTICS-TAB.md](07-ANALYTICS-TAB.md)  
**Next**: [09-SCADA-TAB.md](09-SCADA-TAB.md)
