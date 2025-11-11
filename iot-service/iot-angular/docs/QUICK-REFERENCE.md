# Quick Reference - Angular SDK Integration

## 🎯 Commands

### Generate/Update SDK
```bash
# Using npm script (recommended)
npm run generate-api

# Or manual
ng-openapi-gen --input http://localhost:3000/api-json --output src/sdk/core
```

### Development
```bash
# Start frontend
npm start

# Start backend (from iot-backend folder)
npm run start:dev
```

## 📁 SDK Structure
```
src/sdk/core/
├── services/
│   ├── app.service.ts
│   └── owners.service.ts
├── models/
│   └── ... (all DTOs)
├── fn/
│   ├── app/
│   └── owners/
├── api.module.ts
├── api-configuration.ts
└── services.ts (barrel export)
```

## 🔥 Import Examples

### Component/Service
```typescript
// Import models
import { OwnerResponseDto, PaginatedResponseDto } from '../../../sdk/core/models';

// Import service
import { OwnersService } from '../../../sdk/core/services';

// Inject in constructor
constructor(private ownersService: OwnersService) { }
```

### Module Setup (app.module.ts)
```typescript
import { ApiModule } from '../sdk/core/api.module';
import { environment } from '../environments/environment';

@NgModule({
    imports: [
        ApiModule.forRoot({ rootUrl: environment.apiUrl })
    ]
})
```

## 📝 Observable Pattern (Team Standard)

### Basic Call
```typescript
this.service.method(params).subscribe(
    (data) => {
        // Success handling
        this.loading = false;
    },
    (err) => {
        // Error handling
        this.loading = false;
        this.error = err.message;
    }
);
```

### With Loading & Error State
```typescript
loadData() {
    this.loading = true;
    this.error = null;
    
    this.ownersService.ownersControllerFindAll({ page: 1 }).subscribe(
        (response: PaginatedResponseDto) => {
            this.loading = false;
            this.data = response.data;
        },
        (err: any) => {
            this.loading = false;
            this.error = err.message || 'Failed to load data';
            console.error('Error:', err);
        }
    );
}
```

## 🎨 Common Operations

### Get List
```typescript
this.ownersService.ownersControllerFindAll({ 
    page: 1, 
    limit: 10,
    search: 'keyword'
}).subscribe(data => { /* ... */ }, err => { /* ... */ });
```

### Get One
```typescript
this.ownersService.ownersControllerFindOne({ 
    id: 'uuid' 
}).subscribe(data => { /* ... */ }, err => { /* ... */ });
```

### Create
```typescript
this.ownersService.ownersControllerCreate({ 
    body: newOwner 
}).subscribe(data => { /* ... */ }, err => { /* ... */ });
```

### Update
```typescript
this.ownersService.ownersControllerUpdate({ 
    id: 'uuid', 
    body: updateData 
}).subscribe(data => { /* ... */ }, err => { /* ... */ });
```

### Delete
```typescript
this.ownersService.ownersControllerRemove({ 
    id: 'uuid' 
}).subscribe(() => { /* ... */ }, err => { /* ... */ });
```

## 🔍 Filter Parameters

### Build Dynamic Filters
```typescript
const params: any = {};
Object.keys(this.filterParams).forEach(key => {
    const value = (this.filterParams as any)[key];
    if (value !== '' && value !== null && value !== undefined) {
        params[key] = value;
    }
});

this.service.method(params).subscribe(...);
```

## ⚙️ Configuration Files

### ng-openapi-gen.json
```json
{
  "input": "http://localhost:3000/api-json",
  "output": "src/sdk/core",
  "module": "ApiModule",
  "configuration": "ApiConfiguration"
}
```

### environment.ts
```typescript
export const environment = {
    production: false,
    apiUrl: 'http://localhost:3000'
};
```

## 🚫 Anti-Patterns (DON'T DO THIS)

### ❌ DON'T use async/await
```typescript
// WRONG
const response = await this.service.method();
```

### ❌ DON'T create service wrapper
```typescript
// WRONG - tidak perlu wrapper
class OwnerService {
    constructor(private ownersService: OwnersService) {}
}
```

### ❌ DON'T import from wrong path
```typescript
// WRONG
import { OwnersService } from '../../app/api/services';

// CORRECT
import { OwnersService } from '../../../sdk/core/services';
```

## 🎯 Best Practices

### ✅ Always set loading state
```typescript
this.loading = true;  // Before API call
this.loading = false; // In success/error callback
```

### ✅ Clear previous error
```typescript
this.error = null;  // Before new API call
```

### ✅ Console log for debugging
```typescript
console.log('Success:', response);
console.error('Error:', err);
```

### ✅ Type your responses
```typescript
.subscribe(
    (response: PaginatedResponseDto) => { /* ... */ },
    (err: any) => { /* ... */ }
)
```

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| SDK not updating | `npm run generate-api` |
| Import errors | Check path: `src/sdk/core/...` |
| Service not injecting | Import `ApiModule` in `app.module.ts` |
| Type mismatch | Regenerate SDK |
| Backend changes not reflected | Regenerate SDK |

## 📚 Useful Links

- **Backend Swagger JSON**: http://localhost:3000/api-json
- **Swagger UI**: http://localhost:3000/api
- **Example Component**: `src/app/pages/owner-test/owner-test.component.ts`
- **Full Guide**: `TEAM-SDK-GUIDE.md`

---

**Last Updated**: 2024
