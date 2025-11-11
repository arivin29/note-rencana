# Team SDK Integration Guide

## 📦 SDK Location
```
src/sdk/core/
├── services/          # Injectable service classes (OwnersService, etc.)
├── models/            # TypeScript DTOs/interfaces
├── fn/                # Function implementations
├── api.module.ts      # Angular module to import
├── api-configuration.ts
└── base-service.ts
```

## 🚀 Quick Start

### 1. Generate/Update SDK
Setiap kali backend Swagger berubah, jalankan:
```bash
npm run generate-api
```

Atau manual:
```bash
ng-openapi-gen --input http://localhost:3000/api-json --output src/sdk/core
```

### 2. Import di Component/Service

```typescript
// Import models
import { 
    OwnerResponseDto, 
    PaginatedResponseDto,
    CreateOwnerDto 
} from '../../../sdk/core/models';

// Import service
import { OwnersService } from '../../../sdk/core/services';

// Inject di constructor
constructor(private ownersService: OwnersService) { }
```

### 3. Gunakan Observable Pattern (Team Standard)

**✅ CORRECT - Team Pattern:**
```typescript
this.ownersService.ownersControllerFindAll({ 
    page: 1, 
    limit: 10 
}).subscribe(
    (response: PaginatedResponseDto) => {
        this.loading = false;
        this.data = response.data;
        console.log('Success:', response);
    },
    (err: any) => {
        this.loading = false;
        this.error = err.message;
        console.error('Error:', err);
    }
);
```

**❌ WRONG - Jangan pakai async/await:**
```typescript
// JANGAN seperti ini
const response = await this.service.method();
```

**❌ WRONG - Jangan pakai service wrapper:**
```typescript
// JANGAN buat wrapper service manual
// Langsung pakai SDK service
```

## 📋 Common Patterns

### Get List dengan Pagination & Filter
```typescript
loadOwners() {
    this.loading = true;
    
    const params = {
        page: this.currentPage,
        limit: 10,
        search: this.searchText,
        industry: this.filterIndustry
    };

    this.ownersService.ownersControllerFindAll(params).subscribe(
        (response: PaginatedResponseDto) => {
            this.loading = false;
            this.owners = response.data;
            this.totalPages = response.meta?.totalPages || 1;
        },
        (err: any) => {
            this.loading = false;
            this.error = 'Failed to load owners';
        }
    );
}
```

### Get Detail by ID
```typescript
loadOwnerDetails(id: string) {
    this.loading = true;
    
    this.ownersService.ownersControllerFindOneDetailed({ id }).subscribe(
        (response: OwnerDetailResponseDto) => {
            this.loading = false;
            this.selectedOwner = response;
        },
        (err: any) => {
            this.loading = false;
            this.error = 'Owner not found';
        }
    );
}
```

### Create Data
```typescript
createOwner() {
    this.loading = true;
    
    const newOwner: CreateOwnerDto = {
        name: this.form.name,
        industry: this.form.industry,
        contactPerson: this.form.contact,
        slaLevel: 'Gold',
        forwardingSettings: {
            enableWebhook: true,
            batchSize: 100
        }
    };

    this.ownersService.ownersControllerCreate({ body: newOwner }).subscribe(
        (response: OwnerResponseDto) => {
            this.loading = false;
            alert('Owner created successfully!');
            this.loadOwners(); // Reload list
        },
        (err: any) => {
            this.loading = false;
            this.error = 'Failed to create owner';
        }
    );
}
```

### Update Data
```typescript
updateOwner(id: string) {
    this.loading = true;
    
    const updateData: UpdateOwnerDto = {
        name: this.form.name,
        industry: this.form.industry
    };

    this.ownersService.ownersControllerUpdate({ id, body: updateData }).subscribe(
        (response: OwnerResponseDto) => {
            this.loading = false;
            alert('Owner updated!');
            this.loadOwners();
        },
        (err: any) => {
            this.loading = false;
            this.error = 'Update failed';
        }
    );
}
```

### Delete Data
```typescript
deleteOwner(id: string) {
    if (!confirm('Are you sure?')) return;
    
    this.loading = true;
    
    this.ownersService.ownersControllerRemove({ id }).subscribe(
        () => {
            this.loading = false;
            alert('Owner deleted!');
            this.loadOwners();
        },
        (err: any) => {
            this.loading = false;
            this.error = 'Delete failed';
        }
    );
}
```

## 🎯 Best Practices

### 1. Loading State Management
```typescript
export class MyComponent {
    loading = false;  // Always track loading state
    
    loadData() {
        this.loading = true;  // Set before API call
        
        this.service.method().subscribe(
            data => {
                this.loading = false;  // Clear in success
            },
            err => {
                this.loading = false;  // Clear in error
            }
        );
    }
}
```

### 2. Error Handling
```typescript
loadData() {
    this.error = null;  // Clear previous error
    
    this.service.method().subscribe(
        data => {
            // Success handling
        },
        err => {
            this.error = err.message || 'Something went wrong';
            console.error('API Error:', err);
        }
    );
}
```

### 3. Clean Parameters
```typescript
// Remove empty filter values
const params: any = {};
Object.keys(this.filterParams).forEach(key => {
    const value = (this.filterParams as any)[key];
    if (value !== '' && value !== null && value !== undefined) {
        params[key] = value;
    }
});

this.service.method(params).subscribe(...);
```

## 🔄 Module Configuration

SDK sudah di-configure di `app.module.ts`:

```typescript
// app.module.ts
import { ApiModule } from '../sdk/core/api.module';
import { environment } from '../environments/environment';

@NgModule({
    imports: [
        // ... other imports
        ApiModule.forRoot({ rootUrl: environment.apiUrl })
    ]
})
```

## 🌐 Environment Setup

```typescript
// environment.ts
export const environment = {
    production: false,
    apiUrl: 'http://localhost:3000'
};

// environment.prod.ts
export const environment = {
    production: true,
    apiUrl: 'https://api.production.com'
};
```

## 📚 Available Services

### OwnersService
- `ownersControllerFindAll(params)` - Get all owners dengan pagination
- `ownersControllerFindOne({ id })` - Get owner by ID (basic)
- `ownersControllerFindOneDetailed({ id })` - Get owner dengan full details
- `ownersControllerCreate({ body })` - Create new owner
- `ownersControllerUpdate({ id, body })` - Update owner
- `ownersControllerRemove({ id })` - Delete owner
- `ownersControllerGetStatistics({})` - Get statistics overview
- `ownersControllerGetWidgetsData({})` - Get widgets data
- `ownersControllerGetOwnerDashboard({ id })` - Get dashboard data
- `ownersControllerGetOwnerProjects({ id })` - Get owner's projects
- `ownersControllerGetOwnerNodes({ id })` - Get owner's nodes
- `ownersControllerGetMonthlyReport({ id, year, month })` - Get monthly report

### AppService
- Health check dan general endpoints

## 🔧 Troubleshooting

### Backend berubah, SDK tidak update?
```bash
npm run generate-api
```

### Import path salah?
Selalu gunakan path dari `src/sdk/core`:
```typescript
import { OwnersService } from '../../../sdk/core/services';
import { OwnerResponseDto } from '../../../sdk/core/models';
```

### Service tidak bisa di-inject?
Pastikan `ApiModule` sudah di-import di `app.module.ts`

### Response type tidak match?
Generate ulang SDK:
```bash
npm run generate-api
```

## 📖 References

- **Example Component**: `src/app/pages/owner-test/owner-test.component.ts`
- **SDK Config**: `ng-openapi-gen.json`
- **API Swagger**: http://localhost:3000/api-json
- **Swagger UI**: http://localhost:3000/api

---

**Last Updated**: 2024
**SDK Generator**: ng-openapi-gen v1.0.4
