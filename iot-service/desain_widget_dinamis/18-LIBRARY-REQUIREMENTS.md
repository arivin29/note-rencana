# 18. Library Requirements - Dynamic Widget System

> **Dokumen ini berisi semua library yang perlu diinstall untuk implementasi Dynamic Widget System**

---

## 📦 Frontend Libraries (iot-angular)

### 🆕 Library Baru yang Perlu Diinstall

| Library | Version | Purpose | License |
|---------|---------|---------|---------|
| `echarts` | ^5.5.1 | Core charting library | Apache 2.0 (FREE) |
| `ngx-echarts` | ^18.0.3 | Angular wrapper for ECharts | MIT |
| `angular-gridster2` | ^18.0.1 | Drag-drop grid layout | MIT |
| `@ctrl/ngx-codemirror` | ^7.0.0 | SQL Editor component | MIT |
| `codemirror` | ^5.65.16 | Core code editor | MIT |
| `socket.io-client` | ^4.7.5 | Real-time WebSocket client | MIT |

### Command Install Frontend

```bash
cd iot-angular

# Core charting
npm install echarts@^5.5.1 ngx-echarts@^18.0.3

# Grid layout for dashboard
npm install angular-gridster2@^18.0.1

# SQL Editor
npm install @ctrl/ngx-codemirror@^7.0.0 codemirror@^5.65.16

# Real-time (if not installed)
npm install socket.io-client@^4.7.5
```

### ✅ Library yang Sudah Ada

| Library | Status | Notes |
|---------|--------|-------|
| `@angular/material` | ✅ Installed | UI Components |
| `@angular/cdk` | ✅ Installed | Drag-drop primitives |
| `chart.js` | ✅ Installed | Bisa dipakai sebagai fallback |
| `apexcharts` | ✅ Installed | Bisa dipakai untuk simple charts |

---

## 📦 Backend Libraries (iot-backend)

### 🆕 Library Baru yang Perlu Diinstall

| Library | Version | Purpose | License |
|---------|---------|---------|---------|
| `@nestjs/websockets` | ^11.0.0 | WebSocket gateway | MIT |
| `@nestjs/platform-socket.io` | ^11.0.0 | Socket.IO adapter | MIT |
| `socket.io` | ^4.7.5 | WebSocket server | MIT |
| `sql-parser` | ^0.5.0 | Parse & validate SQL | MIT |

### Command Install Backend

```bash
cd iot-backend

# WebSocket support
npm install @nestjs/websockets@^11.0.0 @nestjs/platform-socket.io@^11.0.0 socket.io@^4.7.5

# SQL Parser for validation (optional, bisa pakai regex)
npm install sql-parser@^0.5.0
```

### ✅ Library yang Sudah Ada

| Library | Status | Notes |
|---------|--------|-------|
| `@nestjs/typeorm` | ✅ Installed | Database ORM |
| `pg` | ✅ Installed | PostgreSQL driver |
| `class-validator` | ✅ Installed | DTO validation |
| `@nestjs/jwt` | ✅ Installed | JWT auth |
| `@nestjs/swagger` | ✅ Installed | API documentation |

---

## 🔧 Installation Script

### Full Installation Script

```bash
#!/bin/bash
# install-widget-libs.sh

echo "🚀 Installing Dynamic Widget System Libraries..."

# Frontend
echo "📦 Installing Frontend Libraries..."
cd /Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-angular

npm install echarts@^5.5.1 ngx-echarts@^18.0.3
npm install angular-gridster2@^18.0.1
npm install @ctrl/ngx-codemirror@^7.0.0 codemirror@^5.65.16
npm install socket.io-client@^4.7.5

echo "✅ Frontend libraries installed!"

# Backend
echo "📦 Installing Backend Libraries..."
cd /Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-backend

npm install @nestjs/websockets@^11.0.0 @nestjs/platform-socket.io@^11.0.0 socket.io@^4.7.5

echo "✅ Backend libraries installed!"

echo "🎉 All libraries installed successfully!"
```

---

## 📋 Version Compatibility Matrix

| Angular Version | ngx-echarts | angular-gridster2 | Notes |
|-----------------|-------------|-------------------|-------|
| 20.x | ^18.0.3 | ^18.0.1 | ✅ Compatible |
| 19.x | ^17.2.0 | ^17.0.0 | - |
| 18.x | ^17.1.0 | ^16.0.0 | - |

| NestJS Version | @nestjs/websockets | socket.io | Notes |
|----------------|-------------------|-----------|-------|
| 11.x | ^11.0.0 | ^4.7.x | ✅ Compatible |
| 10.x | ^10.0.0 | ^4.6.x | - |

---

## 🔍 Library Details

### 1. Apache ECharts

```typescript
// Kenapa ECharts?
// ✅ 100% FREE - Apache 2.0 License
// ✅ No branding/watermark
// ✅ Rich chart types (50+)
// ✅ Great performance
// ✅ Excellent documentation
// ✅ Active community

// Basic usage
import * as echarts from 'echarts';

const chart = echarts.init(document.getElementById('chart'));
chart.setOption({
  xAxis: { type: 'category', data: ['Mon', 'Tue', 'Wed'] },
  yAxis: { type: 'value' },
  series: [{ type: 'line', data: [150, 230, 224] }]
});
```

### 2. angular-gridster2

```typescript
// Kenapa gridster2?
// ✅ Drag & drop grid
// ✅ Resize widgets
// ✅ Responsive
// ✅ Angular native

// Basic usage
import { GridsterModule } from 'angular-gridster2';

@NgModule({
  imports: [GridsterModule]
})
```

### 3. ngx-codemirror (SQL Editor)

```typescript
// Kenapa codemirror?
// ✅ Syntax highlighting
// ✅ Auto-complete
// ✅ Line numbers
// ✅ SQL mode support

// Basic usage
import { CodemirrorModule } from '@ctrl/ngx-codemirror';

@NgModule({
  imports: [CodemirrorModule]
})
```

---

## 📁 Module Setup After Install

### Frontend: app.config.ts

```typescript
import { provideEcharts } from 'ngx-echarts';

export const appConfig: ApplicationConfig = {
  providers: [
    // ... existing providers
    provideEcharts(),
  ]
};
```

### Frontend: Import Modules

```typescript
// In your widget module
import { NgxEchartsModule } from 'ngx-echarts';
import { GridsterModule } from 'angular-gridster2';
import { CodemirrorModule } from '@ctrl/ngx-codemirror';

@NgModule({
  imports: [
    NgxEchartsModule.forRoot({
      echarts: () => import('echarts')
    }),
    GridsterModule,
    CodemirrorModule
  ]
})
export class WidgetModule { }
```

### Backend: WebSocket Gateway Setup

```typescript
// src/main.ts
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new IoAdapter(app));
  // ...
}
```

---

## ⚠️ Notes

1. **ECharts vs Chart.js**: Project sudah punya Chart.js, tapi ECharts lebih powerful untuk IoT dashboard
2. **Socket.IO**: Pastikan versi frontend dan backend sama (^4.7.x)
3. **Codemirror v5 vs v6**: Pakai v5 karena @ctrl/ngx-codemirror belum full support v6

---

## 📚 References

- [ECharts Documentation](https://echarts.apache.org/en/index.html)
- [ngx-echarts GitHub](https://github.com/xieziyu/ngx-echarts)
- [angular-gridster2 GitHub](https://github.com/tiberiuzuld/angular-gridster2)
- [ngx-codemirror GitHub](https://github.com/scttcper/ngx-codemirror)
- [NestJS WebSockets](https://docs.nestjs.com/websockets/gateways)

---

**Next Step**: Lihat [19-TASK-TRACKING.md](./19-TASK-TRACKING.md) untuk task list implementasi
