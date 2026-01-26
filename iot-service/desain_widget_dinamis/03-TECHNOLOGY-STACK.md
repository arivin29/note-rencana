# 📋 03 - Technology Stack

> **Document:** Technology Stack & Dependencies  
> **Version:** 1.0.0  
> **Last Updated:** January 25, 2026

---

## 3.1 Overview

Dokumen ini mendefinisikan semua teknologi, library, dan dependencies yang akan digunakan untuk implementasi Dynamic Dashboard System.

---

## 3.2 Backend Stack (NestJS)

### Core Framework

| Package | Version | Purpose |
|---------|---------|---------|
| `@nestjs/core` | ^10.x | Core NestJS framework |
| `@nestjs/common` | ^10.x | Common utilities |
| `@nestjs/typeorm` | ^10.x | Database ORM integration |
| `typeorm` | ^0.3.x | ORM for PostgreSQL |
| `pg` | ^8.x | PostgreSQL driver |

### New Dependencies for Dashboard

| Package | Version | Purpose | Installation |
|---------|---------|---------|--------------|
| `@nestjs/websockets` | ^10.x | WebSocket support | `npm install @nestjs/websockets` |
| `@nestjs/platform-socket.io` | ^10.x | Socket.IO adapter | `npm install @nestjs/platform-socket.io` |
| `socket.io` | ^4.x | WebSocket library | `npm install socket.io` |
| `class-validator` | ^0.14.x | DTO validation | Already installed |
| `class-transformer` | ^0.5.x | DTO transformation | Already installed |

### Backend Installation Command

```bash
cd iot-backend

# WebSocket dependencies
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io

# Types
npm install -D @types/socket.io
```

---

## 3.3 Frontend Stack (Angular)

### Core Framework

| Package | Version | Purpose |
|---------|---------|---------|
| `@angular/core` | ^20.x | Core Angular framework |
| `@angular/common` | ^20.x | Common utilities |
| `@angular/router` | ^20.x | Routing |
| `@angular/forms` | ^20.x | Reactive forms |

### New Dependencies for Dashboard

#### Grid Layout Library

| Package | Version | Purpose | Note |
|---------|---------|---------|------|
| `angular-gridster2` | ^18.x | Drag-drop grid layout | **RECOMMENDED** |

**Why angular-gridster2?**
- Native Angular support (not wrapper)
- Active maintenance
- Good documentation
- Built-in drag-drop & resize
- Responsive support
- Used by many enterprise apps

```bash
npm install angular-gridster2
```

#### Chart Library

| Package | Version | Purpose | Note |
|---------|---------|---------|------|
| `ngx-echarts` | ^20.0.1 | Angular directive for ECharts | **RECOMMENDED** |
| `echarts` | ^5.5.x | Core Apache ECharts | Required |

**Why Apache ECharts?**

| Criteria | ngx-charts (Swimlane) | ApexCharts | **ECharts** | amCharts 5 |
|----------|----------------------|------------|-------------|------------|
| Performance (>10K points) | ❌ Poor | ⚠️ Medium | ✅ **Millions** | ✅ Excellent |
| Real-time streaming | ❌ Basic | ✅ Good | ✅ **Built-in** | ✅ Good |
| Chart types | ~15 | ~25 | **~40+** | ~30+ |
| Bundle size (tree-shake) | 180KB | 130KB | **~60KB** | 350KB |
| Grafana-like UX | ❌ | ⚠️ | ✅ **Very close** | ✅ Close |
| IoT time-series features | ❌ | ⚠️ | ✅ **dataZoom, brush** | ✅ |
| Maintenance | ⚠️ Slow | ✅ | ✅ **Apache Foundation** | ✅ |
| License | MIT | MIT | **Apache 2.0** | Commercial |

**ECharts Key Features untuk IoT:**
- **dataZoom** - Pan & zoom pada time-series data
- **brush** - Selection area untuk analisis
- **incremental rendering** - Handle jutaan data points
- **streaming support** - Real-time update tanpa redraw
- **multi-axis** - Multiple Y-axis untuk berbagai sensor
- **theme support** - Dark/light mode (Grafana-like)
- **tree-shaking** - Import hanya chart yang dibutuhkan

```bash
npm install ngx-echarts echarts
```

**Tree-shaking Import Example:**
```typescript
// main.ts - Only import what you need
import * as echarts from 'echarts/core';
import { LineChart, BarChart, GaugeChart, PieChart } from 'echarts/charts';
import {
  TitleComponent, TooltipComponent, GridComponent,
  LegendComponent, DataZoomComponent, ToolboxComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  LineChart, BarChart, GaugeChart, PieChart,
  TitleComponent, TooltipComponent, GridComponent,
  LegendComponent, DataZoomComponent, ToolboxComponent,
  CanvasRenderer
]);
```

#### WebSocket Client

| Package | Version | Purpose |
|---------|---------|---------|
| `socket.io-client` | ^4.x | WebSocket client |
| `@types/socket.io-client` | ^3.x | TypeScript types |

```bash
npm install socket.io-client
npm install -D @types/socket.io-client
```

#### Additional UI Components

| Package | Version | Purpose | Note |
|---------|---------|---------|------|
| `@ng-select/ng-select` | ^13.x | Advanced select/dropdown | Untuk data source selector |
| `ngx-color-picker` | ^16.x | Color picker | Widget config |
| `@angular/cdk/drag-drop` | ^20.x | Drag drop utilities | Widget library drag |

```bash
npm install @ng-select/ng-select ngx-color-picker
```

### Frontend Installation Command (Complete)

```bash
cd iot-angular

# Grid layout
npm install angular-gridster2

# Charts
npm install ngx-echarts echarts

# WebSocket
npm install socket.io-client
npm install -D @types/socket.io-client

# UI Components
npm install @ng-select/ng-select ngx-color-picker
```

---

## 3.4 Module Configuration

### Angular Module Setup

```typescript
// app.config.ts atau shared module
import { provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { LineChart, BarChart, GaugeChart, PieChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

// Register ECharts components
echarts.use([
  LineChart,
  BarChart,
  GaugeChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  CanvasRenderer
]);

// In providers
provideEchartsCore({ echarts })
```

```typescript
// dynamic-dashboards.module.ts
import { GridsterModule } from 'angular-gridster2';
import { NgxEchartsModule } from 'ngx-echarts';
import { NgSelectModule } from '@ng-select/ng-select';
import { ColorPickerModule } from 'ngx-color-picker';

@NgModule({
  imports: [
    GridsterModule,
    NgxEchartsModule,
    NgSelectModule,
    ColorPickerModule,
    // ...
  ],
})
export class DynamicDashboardsModule {}
```

---

## 3.5 Library Comparison Matrix

### Grid Layout Libraries

| Library | Angular Support | Drag-Drop | Resize | Responsive | Maintenance | Choice |
|---------|-----------------|-----------|--------|------------|-------------|--------|
| angular-gridster2 | Native | ✅ | ✅ | ✅ | Active | ✅ **Selected** |
| angular2-grid | Wrapper | ✅ | ✅ | ⚠️ | Stale | ❌ |
| ngx-grid-layout | Native | ✅ | ✅ | ✅ | Low | ❌ |
| Angular CDK | Native | ✅ | Manual | Manual | Active | ❌ Complex |

### Chart Libraries

| Library | Chart Types | Performance | Bundle Size | Learning Curve | Choice |
|---------|-------------|-------------|-------------|----------------|--------|
| ECharts | 20+ | Excellent | ~300KB | Medium | ✅ **Selected** |
| Chart.js | 8 | Good | ~60KB | Easy | ❌ Limited |
| Highcharts | 20+ | Excellent | ~200KB | Medium | ❌ License |
| D3.js | Unlimited | Good | ~250KB | Hard | ❌ Complex |
| ApexCharts | 15+ | Good | ~150KB | Easy | ⚠️ Alternative |

---

## 3.6 Version Compatibility Matrix

```
┌─────────────────────────────────────────────────────────────┐
│                    Version Compatibility                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Angular 20.x ─────┬──── angular-gridster2 ^18.x            │
│                    │                                         │
│                    ├──── ngx-echarts ^18.x                  │
│                    │         └──── echarts ^5.x              │
│                    │                                         │
│                    ├──── socket.io-client ^4.x              │
│                    │                                         │
│                    ├──── @ng-select/ng-select ^13.x         │
│                    │                                         │
│                    └──── ngx-color-picker ^16.x             │
│                                                              │
│  NestJS 10.x ──────┬──── @nestjs/websockets ^10.x           │
│                    │                                         │
│                    ├──── socket.io ^4.x                     │
│                    │                                         │
│                    └──── typeorm ^0.3.x                     │
│                              └──── PostgreSQL 14+           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 3.7 Development Tools

### Required Tools

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | ^20.x | Runtime |
| npm | ^10.x | Package manager |
| PostgreSQL | ^14.x | Database |
| VS Code | Latest | IDE |

### Recommended VS Code Extensions

| Extension | ID | Purpose |
|-----------|----|---------| 
| Angular Language Service | angular.ng-template | Angular IntelliSense |
| ESLint | dbaeumer.vscode-eslint | Linting |
| Prettier | esbenp.prettier-vscode | Formatting |
| GitLens | eamodio.gitlens | Git integration |
| REST Client | humao.rest-client | API testing |

---

## 3.8 Browser Support

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | Latest 2 versions | ✅ Full |
| Firefox | Latest 2 versions | ✅ Full |
| Safari | Latest 2 versions | ✅ Full |
| Edge | Latest 2 versions | ✅ Full |
| IE 11 | - | ❌ Not supported |

---

## 3.9 Installation Checklist

### Backend Setup

```bash
# Navigate to backend
cd iot-backend

# Install WebSocket dependencies
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io

# Install types
npm install -D @types/socket.io

# Verify installation
npm list @nestjs/websockets socket.io
```

### Frontend Setup

```bash
# Navigate to frontend
cd iot-angular

# Install all dashboard dependencies
npm install angular-gridster2 ngx-echarts echarts socket.io-client @ng-select/ng-select ngx-color-picker

# Install types
npm install -D @types/socket.io-client

# Verify installation
npm list angular-gridster2 ngx-echarts echarts
```

### Verification Commands

```bash
# Check Angular version
ng version

# Check installed packages
npm list --depth=0

# Test build
ng build --configuration=development
```

---

## 3.10 Package.json Updates

### Frontend (iot-angular/package.json)

```json
{
  "dependencies": {
    // ... existing dependencies ...
    
    // Dashboard specific (NEW)
    "angular-gridster2": "^18.0.0",
    "ngx-echarts": "^18.0.0",
    "echarts": "^5.5.0",
    "socket.io-client": "^4.7.0",
    "@ng-select/ng-select": "^13.0.0",
    "ngx-color-picker": "^16.0.0"
  },
  "devDependencies": {
    // ... existing devDependencies ...
    "@types/socket.io-client": "^3.0.0"
  }
}
```

### Backend (iot-backend/package.json)

```json
{
  "dependencies": {
    // ... existing dependencies ...
    
    // WebSocket (NEW)
    "@nestjs/websockets": "^10.0.0",
    "@nestjs/platform-socket.io": "^10.0.0",
    "socket.io": "^4.7.0"
  },
  "devDependencies": {
    // ... existing devDependencies ...
    "@types/socket.io": "^3.0.0"
  }
}
```

---

## Navigation

⬅️ [Previous: User Stories](./02-USER-STORIES.md) | [Back to Index](./00-INDEX.md) | [Next: Database Design](./04-DATABASE-DESIGN.md) ➡️
