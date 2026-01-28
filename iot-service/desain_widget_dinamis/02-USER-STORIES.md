# 📋 02 - User Stories

> **Document:** User Stories & Requirements  
> **Version:** 1.0.0  
> **Last Updated:** January 25, 2026

---

## 2.1 User Roles

| Role | Description | Dashboard Access |
|------|-------------|------------------|
| **Admin** | System administrator | View all dashboards, manage templates |
| **Owner** | Tenant owner | Full access to own dashboards |
| **Operator** | Owner's team member | View & edit shared dashboards |
| **Viewer** | Read-only user | View shared dashboards only |

---

## 2.2 Epic: Dashboard Management

### US-101: Create New Dashboard

```
AS A     Owner/Operator
I WANT   to create a new dashboard with name and description
SO THAT  I can organize my monitoring views
```

**Acceptance Criteria:**
- [ ] User can click "New Dashboard" button
- [ ] Modal/form appears asking for name (required) and description (optional)
- [ ] User can select associated project (optional)
- [ ] Dashboard is created with empty canvas
- [ ] User is redirected to dashboard editor

**Priority:** HIGH  
**Story Points:** 3

---

### US-102: View Dashboard List

```
AS A     Owner/Operator
I WANT   to see list of my dashboards
SO THAT  I can quickly navigate to the one I need
```

**Acceptance Criteria:**
- [ ] Page shows grid/list of dashboards
- [ ] Each card shows: name, description, thumbnail, last modified date
- [ ] User can search by name
- [ ] User can filter by project
- [ ] User can sort by name/date
- [ ] Click on card opens dashboard viewer

**Priority:** HIGH  
**Story Points:** 3

---

### US-103: Edit Dashboard Properties

```
AS A     Owner/Operator
I WANT   to edit dashboard name, description, and settings
SO THAT  I can keep my dashboards organized
```

**Acceptance Criteria:**
- [ ] User can access settings from dashboard editor
- [ ] Can edit name, description
- [ ] Can change associated project
- [ ] Can set default time range
- [ ] Can set auto-refresh interval
- [ ] Changes are saved immediately

**Priority:** MEDIUM  
**Story Points:** 2

---

### US-104: Delete Dashboard

```
AS A     Owner
I WANT   to delete dashboards I no longer need
SO THAT  I can keep my workspace clean
```

**Acceptance Criteria:**
- [ ] User can delete from list or editor
- [ ] Confirmation dialog appears
- [ ] All widgets are deleted with dashboard
- [ ] User is redirected to list after deletion

**Priority:** MEDIUM  
**Story Points:** 1

---

### US-105: Duplicate Dashboard

```
AS A     Owner/Operator
I WANT   to duplicate an existing dashboard
SO THAT  I can quickly create similar dashboards
```

**Acceptance Criteria:**
- [ ] User can click "Duplicate" on any dashboard
- [ ] New dashboard created with "(Copy)" suffix
- [ ] All widgets are duplicated
- [ ] User is redirected to new dashboard editor

**Priority:** LOW  
**Story Points:** 2

---

## 2.3 Epic: Widget Management

### US-201: Add Widget to Dashboard

```
AS A     Owner/Operator
I WANT   to add widgets to my dashboard
SO THAT  I can visualize my IoT data
```

**Acceptance Criteria:**
- [ ] Widget library panel shows available widget types
- [ ] User can drag widget to canvas OR click to add
- [ ] Widget appears with default configuration
- [ ] Config modal opens automatically for new widget
- [ ] User must configure data source before saving

**Priority:** HIGH  
**Story Points:** 5

---

### US-202: Configure Widget

```
AS A     Owner/Operator
I WANT   to configure widget settings and data source
SO THAT  the widget displays the data I need
```

**Acceptance Criteria:**
- [ ] Double-click or edit button opens config modal
- [ ] Can edit widget title
- [ ] Can select data source (node → sensor → channel)
- [ ] Can configure widget-specific options (colors, thresholds, etc.)
- [ ] Can set refresh interval
- [ ] Preview shows live data before saving
- [ ] Validation prevents invalid configurations

**Priority:** HIGH  
**Story Points:** 8

---

### US-203: Move and Resize Widget

```
AS A     Owner/Operator
I WANT   to drag widgets and resize them
SO THAT  I can arrange my dashboard layout
```

**Acceptance Criteria:**
- [ ] Widgets can be dragged to new position
- [ ] Widgets can be resized from corners/edges
- [ ] Grid snapping for alignment
- [ ] Collision detection (no overlapping)
- [ ] Minimum size enforced per widget type
- [ ] Layout saved automatically after change

**Priority:** HIGH  
**Story Points:** 5

---

### US-204: Delete Widget

```
AS A     Owner/Operator
I WANT   to remove widgets from my dashboard
SO THAT  I can update my monitoring views
```

**Acceptance Criteria:**
- [ ] Delete button on widget toolbar
- [ ] Confirmation dialog (optional, can disable)
- [ ] Widget removed immediately
- [ ] Layout adjusts if needed

**Priority:** HIGH  
**Story Points:** 1

---

### US-205: Duplicate Widget

```
AS A     Owner/Operator
I WANT   to duplicate a widget
SO THAT  I can quickly create similar visualizations
```

**Acceptance Criteria:**
- [ ] Duplicate button on widget toolbar
- [ ] New widget created with same config
- [ ] Placed next to original or in empty space
- [ ] User can edit config after duplication

**Priority:** LOW  
**Story Points:** 2

---

## 2.4 Epic: Data Visualization

### US-301: View Real-time Data

```
AS A     User
I WANT   to see data update in real-time
SO THAT  I can monitor current conditions
```

**Acceptance Criteria:**
- [ ] Widgets update without page refresh
- [ ] Update frequency based on widget config
- [ ] Visual indicator when data updates
- [ ] Graceful handling of connection loss
- [ ] Reconnection automatic

**Priority:** HIGH  
**Story Points:** 8

---

### US-302: Select Time Range

```
AS A     User
I WANT   to select different time ranges for data
SO THAT  I can analyze historical trends
```

**Acceptance Criteria:**
- [ ] Time range picker in dashboard toolbar
- [ ] Preset options: Last 15m, 1h, 6h, 24h, 7d, 30d
- [ ] Custom range picker
- [ ] All widgets respect selected range
- [ ] Individual widget can override

**Priority:** MEDIUM  
**Story Points:** 3

---

### US-303: Drill Down to Details

```
AS A     User
I WANT   to click on a widget to see more details
SO THAT  I can investigate specific data points
```

**Acceptance Criteria:**
- [ ] Click on chart point shows tooltip with details
- [ ] Option to navigate to node/sensor detail page
- [ ] Table widgets can link to related data

**Priority:** LOW  
**Story Points:** 3

---

## 2.5 Epic: Dashboard Sharing

### US-401: Share Dashboard

```
AS A     Owner
I WANT   to share my dashboard with other users
SO THAT  my team can view the same data
```

**Acceptance Criteria:**
- [ ] Share button opens sharing modal
- [ ] Can search and select users/owners
- [ ] Can set permission level (view/edit)
- [ ] Shared users see dashboard in their list
- [ ] Can revoke sharing at any time

**Priority:** MEDIUM  
**Story Points:** 5

---

### US-402: Make Dashboard Public

```
AS A     Owner
I WANT   to make a dashboard publicly accessible
SO THAT  external stakeholders can view without login
```

**Acceptance Criteria:**
- [ ] Toggle for "Public" in dashboard settings
- [ ] Generates shareable URL
- [ ] No login required to view
- [ ] Read-only access
- [ ] Can disable public access

**Priority:** LOW  
**Story Points:** 3

---

## 2.6 Epic: Admin Features

### US-501: View All Dashboards (Admin)

```
AS A     Admin
I WANT   to see all dashboards across all owners
SO THAT  I can monitor system usage
```

**Acceptance Criteria:**
- [ ] Admin sees all dashboards in list
- [ ] Can filter by owner
- [ ] Can see dashboard stats (widgets count, last accessed)

**Priority:** LOW  
**Story Points:** 2

---

### US-502: Create Dashboard Template

```
AS A     Admin
I WANT   to create dashboard templates
SO THAT  new owners can start with useful defaults
```

**Acceptance Criteria:**
- [ ] Admin can mark dashboard as "template"
- [ ] Templates visible to all users
- [ ] Users can create new dashboard from template
- [ ] Template widgets use placeholder data sources

**Priority:** LOW  
**Story Points:** 5

---

## 2.7 User Story Map

```
                    Dashboard Journey
                          │
    ┌─────────────────────┼─────────────────────┐
    │                     │                     │
    ▼                     ▼                     ▼
┌─────────┐        ┌─────────────┐        ┌─────────┐
│ Create  │        │   Edit      │        │  View   │
│Dashboard│        │ Dashboard   │        │Dashboard│
└────┬────┘        └──────┬──────┘        └────┬────┘
     │                    │                    │
     ▼                    ▼                    ▼
┌─────────┐        ┌─────────────┐        ┌─────────┐
│US-101   │        │ US-201      │        │US-301   │
│US-102   │        │ US-202      │        │US-302   │
│US-103   │        │ US-203      │        │US-303   │
│US-104   │        │ US-204      │        │         │
│US-105   │        │ US-205      │        │         │
└─────────┘        └─────────────┘        └─────────┘

                    Phase 1 (MVP)
────────────────────────────────────────────────────
US-101, US-102, US-103, US-104
US-201, US-202, US-203, US-204
US-301

                    Phase 2
────────────────────────────────────────────────────
US-105, US-205
US-302, US-303

                    Phase 3
────────────────────────────────────────────────────
US-401, US-402
US-501, US-502
```

---

## 2.8 Acceptance Test Scenarios

### Scenario: Create Dashboard with Line Chart Widget

```gherkin
Feature: Dashboard Creation

Scenario: User creates dashboard with temperature chart
  Given I am logged in as an Owner
  And I have at least one node with temperature sensor
  
  When I click "New Dashboard"
  And I enter name "Temperature Monitoring"
  And I click "Create"
  
  Then I should see empty dashboard editor
  
  When I drag "Line Chart" widget to canvas
  And I configure data source:
    | Field    | Value               |
    | Node     | Production Node 1   |
    | Sensor   | Environment Sensor  |
    | Channel  | temperature         |
  And I set title to "Temperature Trend"
  And I click "Save Widget"
  
  Then I should see line chart with temperature data
  And widget should update every 30 seconds
```

---

## Navigation

⬅️ [Previous: Overview](./01-OVERVIEW.md) | [Back to Index](./00-INDEX.md) | [Next: Technology Stack](./03-TECHNOLOGY-STACK.md) ➡️
