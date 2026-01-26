# 📋 04 - Database Design

> **Document:** Database Design & Schema  
> **Version:** 1.0.0  
> **Last Updated:** January 25, 2026

---

## 4.1 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DATABASE SCHEMA                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  EXISTING TABLES                          NEW TABLES                            │
│  ───────────────                          ──────────                            │
│                                                                                  │
│  ┌──────────────┐                        ┌──────────────────┐                   │
│  │   owners     │                        │    dashboards    │                   │
│  ├──────────────┤                        ├──────────────────┤                   │
│  │ id_owner PK  │◄───────────────────────│ id_owner FK      │                   │
│  │ name         │                        │ id_project FK    │───┐               │
│  │ ...          │                        │ name             │   │               │
│  └──────────────┘                        │ description      │   │               │
│         │                                │ is_public        │   │               │
│         │                                │ is_template      │   │               │
│         │                                │ settings JSONB   │   │               │
│         ▼                                │ layout JSONB     │   │               │
│  ┌──────────────┐                        │ created_at       │   │               │
│  │   projects   │◄───────────────────────│ updated_at       │   │               │
│  ├──────────────┤                        └────────┬─────────┘   │               │
│  │ id_project PK│                                 │             │               │
│  │ id_owner FK  │                                 │ 1:N         │               │
│  │ name         │                                 ▼             │               │
│  └──────────────┘                        ┌──────────────────┐   │               │
│         │                                │     widgets      │   │               │
│         │                                ├──────────────────┤   │               │
│         ▼                                │ id_dashboard FK  │   │               │
│  ┌──────────────┐                        │ widget_type      │   │               │
│  │    nodes     │◄───────────────────────│ title            │   │               │
│  ├──────────────┤     (via data_source)  │ grid_position    │   │               │
│  │ id_node PK   │                        │ grid_size JSONB  │   │               │
│  │ id_project FK│                        │ data_source JSONB│───┼──► References │
│  │ name         │                        │ config JSONB     │   │    nodes &    │
│  └──────────────┘                        │ refresh_interval │   │    sensors    │
│         │                                │ z_index          │   │               │
│         │ 1:N                            │ created_at       │   │               │
│         ▼                                └──────────────────┘   │               │
│  ┌──────────────┐                                               │               │
│  │   sensors    │◄──────────────────────────────────────────────┘               │
│  ├──────────────┤                                                               │
│  │ id_sensor PK │                        ┌──────────────────┐                   │
│  │ id_node FK   │                        │ dashboard_shares │                   │
│  │ name         │                        ├──────────────────┤                   │
│  │ channels     │                        │ id_dashboard FK  │                   │
│  └──────────────┘                        │ shared_to_owner  │                   │
│                                          │ permission       │                   │
│                                          │ created_at       │                   │
│                                          └──────────────────┘                   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4.2 Table Definitions

### 4.2.1 dashboards

Table utama untuk menyimpan konfigurasi dashboard.

```sql
CREATE TABLE dashboards (
    -- Primary Key
    id_dashboard UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Keys
    id_owner UUID NOT NULL,
    id_project UUID,
    
    -- Basic Info
    name VARCHAR(100) NOT NULL,
    description TEXT,
    thumbnail_url VARCHAR(500),
    
    -- Visibility
    is_public BOOLEAN DEFAULT FALSE,
    is_template BOOLEAN DEFAULT FALSE,
    
    -- Global Settings (JSONB)
    settings JSONB DEFAULT '{
        "refreshInterval": 30,
        "theme": "light",
        "timeRange": {
            "type": "relative",
            "value": "1h"
        }
    }'::jsonb,
    
    -- Layout Configuration (JSONB)
    layout JSONB DEFAULT '{
        "columns": 12,
        "rowHeight": 50,
        "margin": [10, 10],
        "draggable": true,
        "resizable": true
    }'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    
    -- Constraints
    CONSTRAINT fk_dashboard_owner 
        FOREIGN KEY (id_owner) REFERENCES owners(id_owner) ON DELETE CASCADE,
    CONSTRAINT fk_dashboard_project 
        FOREIGN KEY (id_project) REFERENCES projects(id_project) ON DELETE SET NULL,
    CONSTRAINT unique_dashboard_name_per_owner 
        UNIQUE (id_owner, name)
);

-- Indexes
CREATE INDEX idx_dashboards_owner ON dashboards(id_owner);
CREATE INDEX idx_dashboards_project ON dashboards(id_project);
CREATE INDEX idx_dashboards_is_template ON dashboards(is_template) WHERE is_template = TRUE;
CREATE INDEX idx_dashboards_is_public ON dashboards(is_public) WHERE is_public = TRUE;
```

#### Settings JSONB Schema

```typescript
interface DashboardSettings {
  refreshInterval: number;      // Auto-refresh in seconds (0 = disabled)
  theme: 'light' | 'dark';      // Dashboard theme
  timeRange: {
    type: 'relative' | 'absolute';
    value: string;              // '1h', '24h', '7d' OR ISO date range
    from?: string;              // For absolute: ISO timestamp
    to?: string;                // For absolute: ISO timestamp
  };
  timezone?: string;            // e.g., 'Asia/Jakarta'
}
```

#### Layout JSONB Schema

```typescript
interface DashboardLayout {
  columns: number;              // Grid columns (default: 12)
  rowHeight: number;            // Row height in pixels
  margin: [number, number];     // [horizontal, vertical] margin
  draggable: boolean;           // Allow widget dragging
  resizable: boolean;           // Allow widget resizing
  pushItems: boolean;           // Push items when dragging
  compactType: 'none' | 'compactUp' | 'compactLeft';
}
```

---

### 4.2.2 widgets

Table untuk menyimpan widget dalam dashboard.

```sql
CREATE TABLE widgets (
    -- Primary Key
    id_widget UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Key
    id_dashboard UUID NOT NULL,
    
    -- Widget Identity
    widget_type VARCHAR(50) NOT NULL,
    title VARCHAR(100),
    description TEXT,
    
    -- Grid Position (JSONB)
    grid_position JSONB NOT NULL DEFAULT '{"x": 0, "y": 0}'::jsonb,
    
    -- Grid Size (JSONB)
    grid_size JSONB NOT NULL DEFAULT '{"w": 4, "h": 3}'::jsonb,
    
    -- Data Source Configuration (JSONB)
    data_source JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Widget-specific Configuration (JSONB)
    config JSONB DEFAULT '{}'::jsonb,
    
    -- Behavior
    refresh_interval_sec INTEGER DEFAULT 30,
    z_index INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT fk_widget_dashboard 
        FOREIGN KEY (id_dashboard) REFERENCES dashboards(id_dashboard) ON DELETE CASCADE,
    CONSTRAINT chk_widget_type 
        CHECK (widget_type IN (
            'line-chart', 'bar-chart', 'pie-chart', 'gauge', 
            'single-value', 'table', 'status-indicator', 'map'
        ))
);

-- Indexes
CREATE INDEX idx_widgets_dashboard ON widgets(id_dashboard);
CREATE INDEX idx_widgets_type ON widgets(widget_type);
```

#### Grid Position JSONB Schema

```typescript
interface GridPosition {
  x: number;    // Column position (0-based)
  y: number;    // Row position (0-based)
}
```

#### Grid Size JSONB Schema

```typescript
interface GridSize {
  w: number;    // Width in columns
  h: number;    // Height in rows
  minW?: number; // Minimum width
  minH?: number; // Minimum height
  maxW?: number; // Maximum width
  maxH?: number; // Maximum height
}
```

#### Data Source JSONB Schema

```typescript
interface DataSourceConfig {
  // Source type
  type: 'sensor' | 'node' | 'alert' | 'aggregate' | 'static';
  
  // Single source (most common)
  nodeId?: string;          // UUID of node
  sensorId?: string;        // UUID of sensor
  channelKey?: string;      // Specific channel (e.g., 'temperature')
  
  // Multiple sources (for comparison charts)
  sources?: Array<{
    nodeId: string;
    sensorId: string;
    channelKey: string;
    label?: string;         // Legend label
    color?: string;         // Line/bar color
  }>;
  
  // Query options
  aggregation?: 'last' | 'avg' | 'min' | 'max' | 'sum' | 'count';
  groupBy?: 'minute' | 'hour' | 'day' | 'week' | 'month';
  
  // Time range (override dashboard default)
  timeRange?: {
    type: 'relative' | 'absolute' | 'dashboard';
    value?: string;
    from?: string;
    to?: string;
  };
  
  // Filters
  filters?: Array<{
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte';
    value: any;
  }>;
  
  // Static data (for static type)
  staticValue?: any;
}
```

#### Config JSONB Schema (per Widget Type)

```typescript
// Line Chart Config
interface LineChartConfig {
  yAxisLabel?: string;
  yAxisMin?: number;
  yAxisMax?: number;
  xAxisLabel?: string;
  showLegend?: boolean;
  showPoints?: boolean;
  lineColor?: string;
  lineWidth?: number;
  fillArea?: boolean;
  fillOpacity?: number;
  smooth?: boolean;
}

// Gauge Config
interface GaugeConfig {
  min: number;
  max: number;
  unit?: string;
  thresholds?: Array<{
    value: number;
    color: string;
    label?: string;
  }>;
  showValue?: boolean;
  startAngle?: number;
  endAngle?: number;
}

// Single Value Config
interface SingleValueConfig {
  unit?: string;
  prefix?: string;
  suffix?: string;
  icon?: string;
  fontSize?: 'sm' | 'md' | 'lg' | 'xl';
  valueColor?: string;
  backgroundColor?: string;
  showTrend?: boolean;
  trendPeriod?: string;
  decimals?: number;
}

// Table Config
interface TableConfig {
  columns: Array<{
    key: string;
    label: string;
    width?: number;
    sortable?: boolean;
    format?: 'text' | 'number' | 'date' | 'status';
  }>;
  pageSize?: number;
  showPagination?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Status Indicator Config
interface StatusIndicatorConfig {
  mapping: Array<{
    value: string | number | boolean;
    label: string;
    color: string;
    icon?: string;
  }>;
  defaultColor?: string;
  defaultLabel?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// Bar Chart Config
interface BarChartConfig {
  orientation?: 'vertical' | 'horizontal';
  showLegend?: boolean;
  showValues?: boolean;
  barWidth?: number;
  colors?: string[];
  stacked?: boolean;
}

// Pie Chart Config
interface PieChartConfig {
  showLegend?: boolean;
  showLabels?: boolean;
  showPercentage?: boolean;
  donut?: boolean;
  donutRadius?: number;
  colors?: string[];
}
```

---

### 4.2.3 dashboard_shares

Table untuk menyimpan sharing permissions.

```sql
CREATE TABLE dashboard_shares (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Keys
    id_dashboard UUID NOT NULL,
    shared_to_owner_id UUID NOT NULL,
    
    -- Permission
    permission VARCHAR(20) DEFAULT 'view',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    
    -- Constraints
    CONSTRAINT fk_share_dashboard 
        FOREIGN KEY (id_dashboard) REFERENCES dashboards(id_dashboard) ON DELETE CASCADE,
    CONSTRAINT fk_share_owner 
        FOREIGN KEY (shared_to_owner_id) REFERENCES owners(id_owner) ON DELETE CASCADE,
    CONSTRAINT unique_dashboard_share 
        UNIQUE (id_dashboard, shared_to_owner_id),
    CONSTRAINT chk_permission 
        CHECK (permission IN ('view', 'edit', 'admin'))
);

-- Indexes
CREATE INDEX idx_shares_dashboard ON dashboard_shares(id_dashboard);
CREATE INDEX idx_shares_owner ON dashboard_shares(shared_to_owner_id);
```

---

## 4.3 Migration Files

### Migration 001: Create Dashboards Table

```sql
-- migrations/001_create_dashboards_table.sql

-- Up
CREATE TABLE IF NOT EXISTS dashboards (
    id_dashboard UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_owner UUID NOT NULL REFERENCES owners(id_owner) ON DELETE CASCADE,
    id_project UUID REFERENCES projects(id_project) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    thumbnail_url VARCHAR(500),
    is_public BOOLEAN DEFAULT FALSE,
    is_template BOOLEAN DEFAULT FALSE,
    settings JSONB DEFAULT '{}'::jsonb,
    layout JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    CONSTRAINT unique_dashboard_name_per_owner UNIQUE (id_owner, name)
);

CREATE INDEX idx_dashboards_owner ON dashboards(id_owner);
CREATE INDEX idx_dashboards_project ON dashboards(id_project);

-- Down
DROP TABLE IF EXISTS dashboards;
```

### Migration 002: Create Widgets Table

```sql
-- migrations/002_create_widgets_table.sql

-- Up
CREATE TABLE IF NOT EXISTS widgets (
    id_widget UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_dashboard UUID NOT NULL REFERENCES dashboards(id_dashboard) ON DELETE CASCADE,
    widget_type VARCHAR(50) NOT NULL,
    title VARCHAR(100),
    description TEXT,
    grid_position JSONB NOT NULL DEFAULT '{"x": 0, "y": 0}'::jsonb,
    grid_size JSONB NOT NULL DEFAULT '{"w": 4, "h": 3}'::jsonb,
    data_source JSONB NOT NULL DEFAULT '{}'::jsonb,
    config JSONB DEFAULT '{}'::jsonb,
    refresh_interval_sec INTEGER DEFAULT 30,
    z_index INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_widgets_dashboard ON widgets(id_dashboard);
CREATE INDEX idx_widgets_type ON widgets(widget_type);

-- Down
DROP TABLE IF EXISTS widgets;
```

### Migration 003: Create Dashboard Shares Table

```sql
-- migrations/003_create_dashboard_shares_table.sql

-- Up
CREATE TABLE IF NOT EXISTS dashboard_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_dashboard UUID NOT NULL REFERENCES dashboards(id_dashboard) ON DELETE CASCADE,
    shared_to_owner_id UUID NOT NULL REFERENCES owners(id_owner) ON DELETE CASCADE,
    permission VARCHAR(20) DEFAULT 'view',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    CONSTRAINT unique_dashboard_share UNIQUE (id_dashboard, shared_to_owner_id)
);

CREATE INDEX idx_shares_dashboard ON dashboard_shares(id_dashboard);
CREATE INDEX idx_shares_owner ON dashboard_shares(shared_to_owner_id);

-- Down
DROP TABLE IF EXISTS dashboard_shares;
```

---

## 4.4 TypeORM Entities

### Dashboard Entity

```typescript
// src/modules/dashboards/entities/dashboard.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Owner } from '../../owners/entities/owner.entity';
import { Project } from '../../projects/entities/project.entity';
import { Widget } from '../../widgets/entities/widget.entity';
import { DashboardShare } from './dashboard-share.entity';

@Entity('dashboards')
export class Dashboard {
  @PrimaryGeneratedColumn('uuid', { name: 'id_dashboard' })
  idDashboard: string;

  @Column({ name: 'id_owner', type: 'uuid' })
  idOwner: string;

  @Column({ name: 'id_project', type: 'uuid', nullable: true })
  idProject: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'thumbnail_url', length: 500, nullable: true })
  thumbnailUrl: string;

  @Column({ name: 'is_public', default: false })
  isPublic: boolean;

  @Column({ name: 'is_template', default: false })
  isTemplate: boolean;

  @Column({ type: 'jsonb', default: {} })
  settings: Record<string, any>;

  @Column({ type: 'jsonb', default: {} })
  layout: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  // Relations
  @ManyToOne(() => Owner, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_owner' })
  owner: Owner;

  @ManyToOne(() => Project, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_project' })
  project: Project;

  @OneToMany(() => Widget, (widget) => widget.dashboard)
  widgets: Widget[];

  @OneToMany(() => DashboardShare, (share) => share.dashboard)
  shares: DashboardShare[];
}
```

### Widget Entity

```typescript
// src/modules/widgets/entities/widget.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Dashboard } from '../../dashboards/entities/dashboard.entity';

@Entity('widgets')
export class Widget {
  @PrimaryGeneratedColumn('uuid', { name: 'id_widget' })
  idWidget: string;

  @Column({ name: 'id_dashboard', type: 'uuid' })
  idDashboard: string;

  @Column({ name: 'widget_type', length: 50 })
  widgetType: string;

  @Column({ length: 100, nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'grid_position', type: 'jsonb' })
  gridPosition: { x: number; y: number };

  @Column({ name: 'grid_size', type: 'jsonb' })
  gridSize: { w: number; h: number; minW?: number; minH?: number };

  @Column({ name: 'data_source', type: 'jsonb' })
  dataSource: Record<string, any>;

  @Column({ type: 'jsonb', default: {} })
  config: Record<string, any>;

  @Column({ name: 'refresh_interval_sec', default: 30 })
  refreshIntervalSec: number;

  @Column({ name: 'z_index', default: 0 })
  zIndex: number;

  @Column({ name: 'is_visible', default: true })
  isVisible: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Dashboard, (dashboard) => dashboard.widgets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_dashboard' })
  dashboard: Dashboard;
}
```

---

## 4.5 Sample Data

```sql
-- Sample Dashboard
INSERT INTO dashboards (id_owner, name, description, settings, layout)
VALUES (
    'existing-owner-uuid',
    'Production Monitoring',
    'Real-time monitoring for production line',
    '{
        "refreshInterval": 30,
        "theme": "light",
        "timeRange": {"type": "relative", "value": "1h"}
    }',
    '{
        "columns": 12,
        "rowHeight": 50,
        "margin": [10, 10]
    }'
);

-- Sample Widgets
INSERT INTO widgets (id_dashboard, widget_type, title, grid_position, grid_size, data_source, config)
VALUES 
(
    'dashboard-uuid',
    'line-chart',
    'Temperature Trend',
    '{"x": 0, "y": 0}',
    '{"w": 6, "h": 4}',
    '{
        "type": "sensor",
        "nodeId": "node-uuid",
        "sensorId": "sensor-uuid",
        "channelKey": "temperature",
        "aggregation": "avg",
        "groupBy": "minute"
    }',
    '{
        "yAxisLabel": "Temperature (°C)",
        "lineColor": "#FF5733",
        "showLegend": true
    }'
),
(
    'dashboard-uuid',
    'gauge',
    'Current Humidity',
    '{"x": 6, "y": 0}',
    '{"w": 3, "h": 4}',
    '{
        "type": "sensor",
        "nodeId": "node-uuid",
        "sensorId": "sensor-uuid",
        "channelKey": "humidity",
        "aggregation": "last"
    }',
    '{
        "min": 0,
        "max": 100,
        "unit": "%",
        "thresholds": [
            {"value": 30, "color": "#f5222d"},
            {"value": 60, "color": "#faad14"},
            {"value": 100, "color": "#52c41a"}
        ]
    }'
),
(
    'dashboard-uuid',
    'single-value',
    'Active Nodes',
    '{"x": 9, "y": 0}',
    '{"w": 3, "h": 2}',
    '{
        "type": "aggregate",
        "aggregation": "count",
        "filters": [
            {"field": "status", "operator": "eq", "value": "online"}
        ]
    }',
    '{
        "icon": "server",
        "fontSize": "xl",
        "valueColor": "#52c41a"
    }'
);
```

---

## Navigation

⬅️ [Previous: Technology Stack](./03-TECHNOLOGY-STACK.md) | [Back to Index](./00-INDEX.md) | [Next: Backend Architecture](./05-BACKEND-ARCHITECTURE.md) ➡️
