# IoT Monitoring System - Project Context

**Last Updated:** December 7, 2025  
**Purpose:** Quick context for new AI chat sessions

---

## 🎯 Project Overview

**Name:** IoT Monitoring System  
**Type:** Full-stack web application for IoT device management  
**Architecture:** Angular frontend + NestJS backend + PostgreSQL + TimescaleDB + MQTT

### Project Structure:
```
iot-service/
├── iot-angular/          # Angular 20.1.0 frontend
├── iot-backend/          # NestJS backend API
├── iot-gtw/             # MQTT Gateway (Node.js)
└── iot-device-esp32/    # ESP32 firmware (PlatformIO)
```

---

## 🏗️ Tech Stack

### Frontend (iot-angular/)
- **Framework:** Angular 20.1.0 + TypeScript 5.6.3
- **UI:** Bootstrap 5, AdminLTE-inspired
- **State:** RxJS Observables
- **HTTP:** Auto-generated SDK via `ng-openapi-gen`
- **Routing:** Angular Router
- **Forms:** Reactive Forms + Template-driven
- **Deployment:** Firebase Hosting (`devetek-helios.web.app`)

### Backend (iot-backend/)
- **Framework:** NestJS 11.x + TypeScript
- **Database:** PostgreSQL 14+ with TimescaleDB
- **ORM:** TypeORM with migrations
- **Auth:** JWT (passport-jwt)
- **API Docs:** Swagger/OpenAPI (`localhost:3000/api`)
- **MQTT:** mqtt.js for device commands
- **Process Manager:** PM2 (production)

### Gateway (iot-gtw/)
- **Runtime:** Node.js
- **MQTT Broker:** Mosquitto / EMQX
- **Protocol:** MQTT v3.1.1/v5.0
- **Purpose:** Bridge between devices and backend

---

## 📂 Key Directories

### Frontend Structure:
```
iot-angular/src/
├── app/
│   ├── pages/                    # Page components
│   │   ├── admin/               # Admin module (users, audit)
│   │   ├── iot/                 # IoT module (nodes, sensors, telemetry)
│   │   └── dashboard/           # Dashboard widgets
│   ├── components/              # Shared components
│   ├── services/                # Angular services (auth, etc.)
│   └── models/                  # TypeScript interfaces
├── sdk/core/                     # Auto-generated SDK (DO NOT EDIT)
│   ├── services/                # API services
│   └── models/                  # DTOs
└── environments/                # Config (apiUrl)
```

### Backend Structure:
```
iot-backend/src/
├── modules/
│   ├── auth/                    # Authentication (JWT)
│   ├── users/                   # User management
│   ├── owners/                  # Owner/tenant management
│   ├── projects/                # Project management
│   ├── nodes/                   # IoT nodes/devices
│   ├── sensors/                 # Sensors & channels
│   ├── sensor-logs/             # Time-series sensor data
│   ├── iot-logs/                # Raw device payloads
│   ├── node-profiles/           # Payload mapping configs
│   ├── node-models/             # Hardware catalog
│   ├── device-commands/         # MQTT relay control
│   └── audit-logs/              # System audit trail
├── database/
│   ├── entities/                # TypeORM entities
│   ├── migrations/              # Database migrations
│   └── seeds/                   # Seed data scripts
└── main.ts                      # App entry (port 3000)
```

---

## 🔑 Key Concepts

### 1. **SDK Auto-Generation**
Frontend SDK is auto-generated from backend Swagger:
```bash
# In iot-angular/
npm run generate-api
# Reads: http://localhost:3000/api-json
# Outputs to: src/sdk/core/
```

### 2. **Observable Pattern**
All API calls use RxJS Observables:
```typescript
this.ownersService.ownersControllerFindAll({}).subscribe({
  next: (response) => { this.data = response.data; },
  error: (err) => { this.error = err.message; }
});
```

### 3. **Data Flow**
```
Device (ESP32) 
  → MQTT → Gateway 
  → Backend (iot-logs) 
  → Parser (node-profiles) 
  → Sensor Logs (TimescaleDB) 
  → Frontend (telemetry)
```

### 4. **Authentication**
- JWT tokens stored in localStorage
- Role-based: `admin` | `tenant`
- Guards: `JwtAuthGuard`, `RolesGuard`
- Token format: `Bearer <token>`

---

## 🚀 Common Commands

### Frontend:
```bash
cd iot-angular
npm start                    # Dev server (localhost:4200)
npm run generate-api         # Generate SDK from backend
npm run build                # Production build
firebase deploy --only hosting:devetek-helios  # Deploy
```

### Backend:
```bash
cd iot-backend
npm run start:dev            # Dev server (localhost:3000)
npm run build                # Build
npm run pm2:start            # Start with PM2
npm run pm2:logs             # View logs
npm run migration:run        # Run migrations
```

### Database:
```bash
psql -U postgres -d iot_db
\dt                          # List tables
\d+ nodes                    # Describe table
```

---

## 📋 Recent Work (Last 7 Days)

### ✅ Completed:
1. **User Management Module** (Phase 9)
   - CRUD for users (admin only)
   - Inline edit modal in detail page
   - Type safety: UserResponseDto
   - Password excluded from responses

2. **Node Mapping Configuration**
   - Drag & drop payload field mapping
   - Telemetry metadata (timestamp, deviceId, signalQuality)
   - Multi-log selection (dropdown to pick from 10 recent logs)
   - Auto-load existing mappings from database

3. **PM2 Configuration**
   - `ecosystem.config.js` created
   - Port: 3000 (backend)
   - Scripts: pm2:start, pm2:logs, pm2:restart, etc.

4. **CORS Configuration**
   - Added Firebase hosting domains
   - `https://devetek-helios.web.app`
   - `https://devetek-helios.firebaseapp.com`

5. **Node Models SDK Migration** (December 7, 2025)
   - ✅ Migrated from dummy data to SDK
   - ✅ Read: `nodeModelsControllerFindAll()`
   - ✅ Create: `nodeModelsControllerCreate()`
   - ✅ Loading & error states
   - 🔜 Update & Delete (TODO)

---

## 🐛 Known Issues / TODOs

### Frontend:
- [ ] Node Models: Implement Update & Delete
- [ ] Telemetry: Add auto-refresh (5-10 seconds)
- [ ] Dashboard: Real-time data with WebSocket
- [ ] Notifications: Toast/alert system

### Backend:
- [ ] WebSocket for real-time updates
- [ ] Background jobs (Bull Queue)
- [ ] Rate limiting (throttle)
- [ ] Database indexes optimization

### Deployment:
- [x] Backend PM2 setup
- [x] Frontend Firebase hosting
- [ ] Nginx reverse proxy config
- [ ] SSL certificates
- [ ] Environment variables management

---

## 📡 API Endpoints Summary

### Core Modules:
| Module | Base Path | Key Endpoints |
|--------|-----------|---------------|
| Auth | `/api/auth` | login, register, profile |
| Users | `/api/users` | CRUD, paginated list |
| Owners | `/api/owners` | CRUD, stats, nested data |
| Projects | `/api/projects` | CRUD, by owner |
| Nodes | `/api/nodes` | CRUD, dashboard, sensors |
| Sensors | `/api/sensors` | CRUD, channels, logs |
| Telemetry | `/api/sensor-logs` | Time-series data, filters |
| IoT Logs | `/api/iot-logs` | Raw payloads, device logs |
| Node Profiles | `/api/node-profiles` | Mapping configs |
| Node Models | `/api/node-models` | Hardware catalog |
| Device Commands | `/api/device-commands` | Relay control (MQTT) |

### Swagger UI:
**http://localhost:3000/api**

---

## 🔧 Configuration Files

### Frontend:
- `angular.json` - Angular build config
- `ng-openapi-gen.json` - SDK generator config
- `firebase.json` - Firebase hosting config
- `src/environments/` - Environment variables

### Backend:
- `nest-cli.json` - NestJS config
- `tsconfig.json` - TypeScript config
- `ecosystem.config.js` - PM2 config
- `.env` - Environment variables (NOT in git)
- `.env.example` - Template

---

## 📚 Documentation

### Project Docs:
```
iot-angular/docs/
├── DOC-INDEX.md
├── TEAM-SDK-GUIDE.md
├── QUICK-REFERENCE.md
└── SDK-GENERATION-FAQ.md

iot-backend/docs/
├── README.md
├── QUICK-REFERENCE.md
├── modules/owners/     # Per-module docs
└── architecture/

Root:
├── NODE-MODELS-SDK-MIGRATION.md
├── PHASE9-USER-MANAGEMENT-COMPLETE.md
├── NODE-MAPPING-UPDATE-COMPLETE.md
└── PM2-DEPLOYMENT-GUIDE.md
```

---

## 🎨 UI/UX Patterns

### Page Structure:
```typescript
export class SomePage implements OnInit {
  loading = false;
  errorMessage = '';
  data: SomeDto[] = [];

  ngOnInit() { this.loadData(); }

  loadData() {
    this.loading = true;
    this.service.getAll({}).subscribe({
      next: (res) => { this.data = res.data; this.loading = false; },
      error: (err) => { this.errorMessage = err.message; this.loading = false; }
    });
  }
}
```

### HTML Template:
```html
<!-- Loading -->
<div *ngIf="loading">Spinner...</div>

<!-- Error -->
<div *ngIf="errorMessage && !loading" class="alert alert-danger">
  {{ errorMessage }}
</div>

<!-- Data -->
<div *ngIf="!loading && !errorMessage">
  <table>...</table>
</div>
```

---

## 🔐 Environment Variables

### Backend (.env):
```bash
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=iot_db
JWT_SECRET=your_secret_key
MQTT_BROKER_URL=mqtt://localhost:1883
```

### Frontend (environment.ts):
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000'
};
```

---

## 🚨 Common Errors & Solutions

### 1. CORS Error
**Problem:** `blocked by CORS policy`  
**Solution:** Check `main.ts` CORS config, add origin

### 2. SDK Generation Fails
**Problem:** `ng-openapi-gen` errors  
**Solution:** Backend must be running, check `http://localhost:3000/api-json`

### 3. Port Already in Use
**Problem:** `EADDRINUSE :::3000`  
**Solution:** `lsof -i :3000`, then `kill -9 <PID>`

### 4. Database Connection Error
**Problem:** `Connection refused`  
**Solution:** Check PostgreSQL service, verify .env credentials

---

## 🎯 Current Focus

**Active Task:** Node Models page migration to SDK  
**Status:** ✅ Complete (Read & Create implemented)  
**Next:** Implement Update & Delete functionality

---

## 💡 Development Tips

1. **Always regenerate SDK** after backend API changes
2. **Use DTO types** from SDK, not custom interfaces
3. **Follow Observable pattern** for all HTTP calls
4. **Check browser console** for API errors
5. **Use PM2 logs** for backend debugging: `pm2 logs iot-backend`
6. **Test CORS locally** before deploying
7. **Commit often** with descriptive messages
8. **Update documentation** when adding features

---

## 📞 Quick Reference Links

- **Backend API:** http://localhost:3000/api
- **Frontend:** http://localhost:4200
- **Production:** https://devetek-helios.web.app
- **Swagger JSON:** http://localhost:3000/api-json

---

**Ready for next chat session! 🚀**

Copy this file content to start a new conversation with full context.
