# IoT Dashboard Project - Complete Context

## 📋 Project Overview

**Project Name**: IoT Dashboard System  
**Type**: Full-Stack IoT Monitoring Platform  
**Owner**: arivin29  
**Repository**: note-rencana (GitHub)  
**Status**: Active Development (November 2025)

### **Tech Stack**

#### **Backend**
- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL 15 + TimescaleDB (Time-Series)
- **ORM**: TypeORM
- **API**: RESTful + OpenAPI (Swagger)
- **Host**: 109.105.194.174:54366 (PostgreSQL)
- **Port**: localhost:3000 (Backend API)

#### **Frontend**
- **Framework**: Angular 18 (TypeScript)
- **UI**: Bootstrap 5 + Custom Components
- **Charts**: ApexCharts (ng-apexcharts)
- **API Client**: ng-openapi-gen (Auto-generated SDK)
- **Port**: localhost:4200 (Angular Dev Server)

#### **Development Environment**
- **OS**: macOS
- **Shell**: zsh
- **Node.js**: v20.19.2
- **Package Manager**: npm

---

## 🎯 Project Purpose

Sistem monitoring IoT untuk mengelola:
1. **Nodes** (Gateway/Perangkat IoT di lapangan)
2. **Sensors** (Sensor fisik terhubung ke Node)
3. **Sensor Channels** (Parameter individual: pressure, flow, temperature, dll)
4. **Telemetry Data** (Time-series sensor readings dengan 32,832+ log entries)
5. **Owners & Projects** (Multi-tenant hierarchy)

### **Key Features**
- Real-time dashboard dengan widget system
- Multi-tenant architecture (Owners → Projects → Nodes → Sensors)
- Time-series data visualization
- CRUD operations untuk semua entitas
- Hierarchical delete dengan validation
- UUID-based resource identification

---

## 🗂️ Database Schema

### **Hierarchy Structure**
```
Owners (Klien/Tenant)
  └─ Projects (Area kerja per owner)
      ├─ Nodes (Gateway IoT di lapangan)
      │   └─ Sensors (Sensor fisik)
      │       └─ Sensor Channels (Parameter individual)
      │           └─ Sensor Logs (Time-series data)
      └─ Node Locations (Koordinat GPS)
```

### **Core Tables**

#### **1. Owners** (Tenant/Klien)
```sql
CREATE TABLE owners (
  id_owner       UUID PRIMARY KEY,
  name           TEXT NOT NULL,
  industry       TEXT,
  contact_person TEXT,
  sla_level      TEXT,
  created_at     TIMESTAMPTZ,
  updated_at     TIMESTAMPTZ
);
```

#### **2. Projects** (Area Kerja)
```sql
CREATE TABLE projects (
  id_project   UUID PRIMARY KEY,
  id_owner     UUID REFERENCES owners(id_owner),
  name         TEXT NOT NULL,
  area_type    TEXT CHECK (area_type IN ('plant','pipeline','farm','other')),
  geofence     JSONB,
  status       TEXT DEFAULT 'active',
  created_at   TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ
);
```

#### **3. Node Models** (Katalog Hardware)
```sql
CREATE TABLE node_models (
  id_node_model      UUID PRIMARY KEY,
  model_code         TEXT UNIQUE,
  vendor             TEXT NOT NULL,
  model_name         TEXT NOT NULL,
  protocol           TEXT NOT NULL,
  hardware_class     TEXT,
  created_at         TIMESTAMPTZ,
  updated_at         TIMESTAMPTZ
);
```

#### **4. Nodes** (Gateway IoT)
```sql
CREATE TABLE nodes (
  id_node                UUID PRIMARY KEY,
  id_project             UUID REFERENCES projects(id_project),
  id_node_model          UUID REFERENCES node_models(id_node_model),
  code                   TEXT NOT NULL,
  serial_number          TEXT,
  dev_eui                TEXT,
  connectivity_status    TEXT DEFAULT 'offline',
  telemetry_interval_sec INTEGER DEFAULT 300,
  created_at             TIMESTAMPTZ,
  updated_at             TIMESTAMPTZ,
  UNIQUE (id_project, code)
);
```

#### **5. Sensor Catalogs** (Master Sensor)
```sql
CREATE TABLE sensor_catalogs (
  id_sensor_catalog         UUID PRIMARY KEY,
  vendor                    TEXT NOT NULL,
  model_name                TEXT NOT NULL,
  icon_asset                TEXT,
  icon_color                TEXT,
  datasheet_url             TEXT,
  default_channels_json     JSONB,
  created_at                TIMESTAMPTZ,
  updated_at                TIMESTAMPTZ
);
```

#### **6. Sensors** (Sensor Fisik) ⭐ **RECENTLY UPDATED**
```sql
CREATE TABLE sensors (
  id_sensor          UUID PRIMARY KEY,
  id_node            UUID REFERENCES nodes(id_node) ON DELETE CASCADE,
  id_sensor_catalog  UUID REFERENCES sensor_catalogs(id_sensor_catalog),
  sensor_code        TEXT,                    -- ✅ NEW: Unique identifier (e.g., SENSOR-001)
  label              TEXT NOT NULL,
  location           TEXT,                    -- ✅ NEW: Physical location (e.g., Tank A)
  status             TEXT DEFAULT 'active',   -- ✅ NEW: active|maintenance|inactive
  protocol_channel   TEXT,
  calibration_factor NUMERIC(12,6),
  sampling_rate      INTEGER,
  install_date       DATE,
  calibration_due_at DATE,
  created_at         TIMESTAMPTZ,
  updated_at         TIMESTAMPTZ,
  CONSTRAINT unique_sensor_code_per_node UNIQUE (id_node, sensor_code)
);
```

#### **7. Sensor Channels** (Parameter Individual)
```sql
CREATE TABLE sensor_channels (
  id_sensor_channel UUID PRIMARY KEY,
  id_sensor         UUID REFERENCES sensors(id_sensor) ON DELETE CASCADE,
  id_sensor_type    UUID REFERENCES sensor_types(id_sensor_type),
  metric_code       TEXT NOT NULL,
  unit              TEXT,
  min_threshold     NUMERIC,
  max_threshold     NUMERIC,
  multiplier        NUMERIC(12,6),
  offset            NUMERIC(12,6),
  register_address  INTEGER,
  created_at        TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ,
  UNIQUE (id_sensor, metric_code)
);
```

#### **8. Sensor Logs** (Time-Series Data)
```sql
CREATE TABLE sensor_logs (
  id_sensor_log     BIGSERIAL PRIMARY KEY,
  id_sensor_channel UUID REFERENCES sensor_channels(id_sensor_channel),
  id_sensor         UUID,  -- Denormalized for performance
  id_node           UUID,  -- Denormalized for performance
  id_project        UUID,  -- Denormalized for performance
  ts                TIMESTAMPTZ NOT NULL,
  value_raw         DOUBLE PRECISION,
  value_engineered  DOUBLE PRECISION,
  quality_flag      TEXT,
  ingestion_source  TEXT,
  status_code       INTEGER
);
-- TimescaleDB hypertable: SELECT create_hypertable('sensor_logs','ts');
```

---

## 🏗️ Architecture Patterns

### **1. Single Source of Truth**
- ✅ Always fetch fresh data from backend
- ✅ No client-side caching for critical data
- ✅ Reload after every mutation (POST/PATCH/DELETE)

### **2. Always Reload Pattern**
```typescript
// After save/update/delete
this.loadData();  // Fetch fresh from backend
```

### **3. Reactive Forms (FormBuilder)**
```typescript
// ✅ Use FormBuilder for all forms
sensorForm: FormGroup;

constructor(private fb: FormBuilder) {
  this.sensorForm = this.fb.group({
    sensorCode: ['', Validators.required],
    label: ['', Validators.required],
    location: [''],
    status: ['active', Validators.required]
  });
}
```

### **4. UUID-Based Routing**
```typescript
// ✅ Use UUID for routes, not code
/nodes/:id  // id = UUID (not node.code)
/sensors/:id  // id = UUID (not sensor.sensorCode)
```

### **5. Hierarchical Delete**
```typescript
// ✅ Validate before delete
- Delete Channel → Check if last channel in sensor
- Delete Sensor → Check if last sensor in node
- Delete Node → Check if has sensors
```

---

## 📁 Project Structure

```
pra-project/
├── iot-service/
│   ├── iot-backend/              # NestJS Backend
│   │   ├── src/
│   │   │   ├── entities/         # TypeORM Entities
│   │   │   ├── modules/          # Feature Modules
│   │   │   │   ├── owners/
│   │   │   │   ├── projects/
│   │   │   │   ├── nodes/
│   │   │   │   ├── sensors/      # ⭐ RECENTLY UPDATED
│   │   │   │   ├── sensor-channels/
│   │   │   │   ├── sensor-catalogs/
│   │   │   │   └── sensor-logs/
│   │   │   ├── database/
│   │   │   └── main.ts
│   │   ├── migrations/           # SQL Migration files
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── iot-angular/              # Angular Frontend
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── pages/
│   │   │   │   │   └── iot/
│   │   │   │   │       ├── owners/
│   │   │   │   │       ├── projects/
│   │   │   │   │       └── nodes/
│   │   │   │   │           ├── nodes-detail/
│   │   │   │   │           │   ├── nodes-detail.ts
│   │   │   │   │           │   ├── node-detail-add-sensor-drawer/  # ⭐ RECENTLY UPDATED
│   │   │   │   │           │   └── node-detail-add-channel-drawer/
│   │   │   │   ├── components/
│   │   │   │   ├── models/
│   │   │   │   └── sdk/          # Auto-generated API client
│   │   │   │       └── core/
│   │   │   │           ├── services/
│   │   │   │           └── models/
│   │   ├── docs/                 # Documentation
│   │   ├── angular.json
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── migrasi.md                # ⭐ Database DDL Documentation
│   ├── delivery-data.md
│   └── rencana.md
│
└── pdam-aceh-besar/              # Other project
```

---

## 🔧 Recent Changes (November 13-14, 2025)

### **Database Schema Updates**
1. ✅ **Added columns to `sensors` table:**
   - `sensor_code` TEXT (unique identifier per sensor)
   - `location` TEXT (physical location description)
   - `status` TEXT (active/maintenance/inactive)

### **Backend Updates**
2. ✅ **Updated `sensor.entity.ts`:**
   ```typescript
   @Column({ type: 'text', nullable: true, name: 'sensor_code' })
   sensorCode: string;
   
   @Column({ type: 'text', nullable: true })
   location: string;
   
   @Column({ type: 'text', nullable: true, default: 'active' })
   status: 'active' | 'maintenance' | 'inactive';
   ```

3. ✅ **Updated DTOs:**
   - `CreateSensorDto` - Added sensorCode, location, status
   - `UpdateSensorDto` - Inherits from CreateSensorDto (PartialType)
   - `SensorResponseDto` - Added sensorCode, location, status

4. ✅ **Updated `sensors.service.ts`:**
   - `create()` method maps new fields
   - `toResponseDto()` includes new fields

### **Frontend Updates**
5. ✅ **Refactored `node-detail-add-sensor-drawer` to use FormBuilder:**
   - Migrated from Template-driven to Reactive Forms
   - Added FormGroup with validators
   - Added validation helper methods
   - Updated template with formControlName bindings

6. ✅ **Added ReactiveFormsModule to `nodes.module.ts`**

7. ✅ **Added path mapping to `tsconfig.json`:**
   ```json
   "paths": {
     "src/*": ["src/*"],
     "@app/*": ["src/app/*"],
     "@sdk/*": ["src/sdk/*"],
     "@models/*": ["src/app/models/*"]
   }
   ```

---

## 🚀 Workflow Patterns

### **1. Adding New Feature**
```bash
# 1. Database: Create migration
CREATE TABLE new_table (...);

# 2. Backend: Create entity
@Entity('new_table')
export class NewTable { ... }

# 3. Backend: Create DTOs
export class CreateNewTableDto { ... }
export class NewTableResponseDto { ... }

# 4. Backend: Create service & controller
@Injectable()
export class NewTableService { ... }

# 5. Frontend: Generate SDK
cd iot-angular
ng-openapi-gen --input http://localhost:3000/api-json --output src/sdk/core

# 6. Frontend: Use SDK in components
import { NewTableService } from '@sdk/core/services';
```

### **2. Form Pattern (FormBuilder)**
```typescript
// Component
export class MyFormComponent {
  myForm: FormGroup;
  
  constructor(private fb: FormBuilder) {
    this.myForm = this.fb.group({
      field1: ['', Validators.required],
      field2: ['', [Validators.required, Validators.min(1)]]
    });
  }
  
  handleSubmit(): void {
    if (this.myForm.invalid) {
      Object.keys(this.myForm.controls).forEach(key => {
        this.myForm.get(key)?.markAsTouched();
      });
      return;
    }
    
    const formValue = this.myForm.value;
    // Call API...
  }
  
  hasError(field: string, errorType: string): boolean {
    const control = this.myForm.get(field);
    return !!(control && control.hasError(errorType) && 
             (control.dirty || control.touched));
  }
}
```

```html
<!-- Template -->
<form [formGroup]="myForm" (ngSubmit)="handleSubmit()">
  <input formControlName="field1" 
         [class.is-invalid]="hasError('field1', 'required')">
  <div class="invalid-feedback" *ngIf="hasError('field1', 'required')">
    Field is required
  </div>
  <button type="submit" [disabled]="myForm.invalid">Submit</button>
</form>
```

### **3. API Call Pattern**
```typescript
// Always reload from backend
loadData(): void {
  this.loading = true;
  this.myService.getAll$().subscribe({
    next: (response) => {
      this.data = this.parseResponse(response);
      this.loading = false;
    },
    error: (err) => {
      console.error('Load failed:', err);
      this.loading = false;
    }
  });
}

// After mutation, always reload
handleSave(): void {
  this.myService.create$(dto).subscribe({
    next: () => {
      this.loadData();  // ✅ Reload from backend
      this.closeDrawer();
    }
  });
}
```

---

## 🧪 Testing Workflow

### **Backend Testing**
```bash
# Test API endpoint
curl -s 'http://localhost:3000/api/sensors?limit=5' | jq '.'

# Test specific sensor
curl -s 'http://localhost:3000/api/sensors/{uuid}' | jq '.'

# Test POST (create)
curl -X POST http://localhost:3000/api/sensors \
  -H "Content-Type: application/json" \
  -d '{"idNode":"...","label":"Test","status":"active"}'
```

### **Frontend Testing**
```bash
# Start dev server
cd iot-angular
npm run start

# Open browser
http://localhost:4200

# Test flow:
# 1. Navigate to Nodes → Node Detail
# 2. Click "Add Sensor"
# 3. Fill form and submit
# 4. Verify data reloaded
```

---

## 📝 Documentation Files

### **Created Documentation**
1. ✅ `REFACTOR-REACTIVE-FORMS-SENSOR-DRAWER.md` - FormBuilder migration guide
2. ✅ `SENSOR-DRAWER-REFACTOR.md` - Single Source of Truth pattern
3. ✅ `ROUTE-PARAMETER-UUID-FIX.md` - UUID routing fix
4. ✅ `DATA-NOT-SHOWING-FIX.md` - Debugging guide
5. ✅ `PROJECT-CONTEXT.md` - This file

### **Core Documentation**
- `migrasi.md` - Complete database DDL
- `rencana.md` - Project planning
- `delivery-data.md` - Data delivery specifications

---

## 🎯 Your Role as AI Assistant

### **Primary Responsibilities**
1. **Backend Development**: NestJS + TypeORM + PostgreSQL
2. **Frontend Development**: Angular + TypeScript + Bootstrap
3. **Database Design**: Schema design, migrations, optimization
4. **API Design**: RESTful endpoints, DTOs, validation
5. **Code Quality**: Following established patterns, best practices
6. **Documentation**: Creating clear, actionable documentation
7. **Debugging**: Troubleshooting compilation errors, runtime issues
8. **Integration**: Connecting backend ↔ frontend with SDK

### **Working Principles**
1. ✅ **Single Source of Truth** - Always fetch from backend
2. ✅ **Always Reload** - Refresh after mutations
3. ✅ **FormBuilder First** - Use Reactive Forms for all forms
4. ✅ **UUID Routing** - Never use code/name in routes
5. ✅ **Hierarchical Validation** - Check dependencies before delete
6. ✅ **Documentation First** - Document patterns and changes
7. ✅ **No Assumptions** - Ask for clarification when needed
8. ✅ **Test After Changes** - Verify with curl/browser

### **Communication Style**
- Use **Indonesian** for explanations
- Use **English** for code/technical terms
- Be **concise** but **complete**
- Provide **working code** with context
- Create **actionable** documentation
- Show **before/after** comparisons

### **Things to Remember**
- ❌ **Never run backend/frontend** - User runs separately
- ❌ **Never assume port is free** - User handles process management
- ✅ **Always check errors** before confirming done
- ✅ **Always test API** with curl after backend changes
- ✅ **Always document** significant changes
- ✅ **Always provide** complete file paths

---

## 🔄 Common Tasks Reference

### **Task 1: Add New Field to Entity**
```bash
# 1. Update database
ALTER TABLE table_name ADD COLUMN new_field TYPE;

# 2. Update entity
@Column({ type: 'text' })
newField: string;

# 3. Update DTOs (Create, Update, Response)

# 4. Update service (create, toResponseDto)

# 5. Test API
curl -s 'http://localhost:3000/api/endpoint' | jq '.'

# 6. Regenerate SDK
cd iot-angular
ng-openapi-gen --input http://localhost:3000/api-json --output src/sdk/core
```

### **Task 2: Add New Form**
```bash
# 1. Create component with FormBuilder

# 2. Add ReactiveFormsModule to module

# 3. Create FormGroup with validators

# 4. Update template with formControlName

# 5. Add validation helpers (hasError, isFieldInvalid)

# 6. Test in browser
```

### **Task 3: Add New Route**
```bash
# 1. Add route to routing module

# 2. Use UUID in route params

# 3. Extract UUID from route

# 4. Call API with UUID

# 5. Display data
```

---

## 📊 Current Data Status

### **Database Statistics**
- **Telemetry Logs**: 32,832 entries
- **Time Range**: 2025-11-10 to 2025-11-12 (48 hours)
- **Sensor Types**: 12 types
- **Nodes**: Multiple active nodes
- **Sensors**: Multiple sensors per node
- **Channels**: Multiple channels per sensor

### **Sample Data Structure**
```
Owner: "PT ABC Indonesia"
  └─ Project: "Plant Site Alpha"
      └─ Node: "ESP-CS-F03" (ESP32 Gateway)
          └─ Sensor: "Sensor-1-ESP-CS-F03"
              ├─ Channel: "pressure" (bar)
              ├─ Channel: "flow" (m³/h)
              └─ Channel: "temperature" (°C)
```

---

## 🔮 Next Steps (When Resuming)

### **Immediate Tasks**
1. ⏳ **Regenerate Angular SDK** - Include new sensor fields
2. ⏳ **Test sensor form** - Verify sensorCode, location, status fields work
3. ⏳ **Apply FormBuilder to channel drawer** - Consistency with sensor drawer

### **Pending Features**
- Dashboard widget system refinement
- Alert rules implementation
- Real-time telemetry updates
- User authentication & authorization
- Multi-tenant access control

---

## 📞 Quick Commands Reference

```bash
# Backend
cd /Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-backend
npm run start:dev  # User runs this separately

# Frontend
cd /Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-angular
npm run start  # User runs this separately

# SDK Generation
cd /Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-angular
ng-openapi-gen --input http://localhost:3000/api-json --output src/sdk/core

# Test API
curl -s 'http://localhost:3000/api/sensors?limit=5' | jq '.'

# Database
psql -h 109.105.194.174 -p 54366 -U your_user -d your_db
```

---

## ✅ Checklist When Starting New Chat

When user says "lanjut" or starts new conversation, ask:

1. ❓ **Backend status** - "Apakah backend sudah running?"
2. ❓ **Frontend status** - "Apakah frontend sudah running?"
3. ❓ **Current task** - "Apa yang sedang dikerjakan?"
4. ❓ **Recent changes** - "Ada perubahan manual yang sudah dilakukan?"
5. ❓ **Errors/Issues** - "Ada error atau masalah yang perlu di-fix?"

Then proceed with:
- ✅ Read this PROJECT-CONTEXT.md
- ✅ Check recent documentation files
- ✅ Verify current file states if edited
- ✅ Continue from last known state

---

**Last Updated**: November 14, 2025, 12:00 AM  
**Status**: Active Development  
**Documentation Version**: 1.0
