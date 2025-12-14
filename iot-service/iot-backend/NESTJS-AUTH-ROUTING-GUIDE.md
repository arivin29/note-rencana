# NestJS Authentication & Routing Guide

## Global JWT Auth Guard

### Setup Complete ✅

**File:** `src/app.module.ts`

```typescript
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  // ...
  providers: [
    AppService,
    // Global JWT Auth Guard - all routes require authentication by default
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
```

**Result:** 
- ✅ Semua routes otomatis require JWT token
- ✅ `req.user` akan tersedia di semua controller methods
- ✅ Login/register endpoints tetap bisa diakses karena pakai `@Public()` decorator

---

## How NestJS Routing Works

### ❌ Tidak Ada File Router Terpisah

NestJS **TIDAK menggunakan file router** seperti Express.js. Routing otomatis dari decorators!

### ✅ Routing via Decorators

#### 1. Controller Level
```typescript
@Controller('nodes')  // Base path: /api/nodes
export class NodesController {
  // ...
}
```

#### 2. Method Level
```typescript
@Get()  // Path: /api/nodes (GET)
findAll() { ... }

@Get(':id')  // Path: /api/nodes/:id (GET)
findOne(@Param('id') id: string) { ... }

@Post()  // Path: /api/nodes (POST)
create(@Body() dto: CreateNodeDto) { ... }

@Get('statistics/overview')  // Path: /api/nodes/statistics/overview (GET)
getStatistics() { ... }
```

**Full URL Examples:**
- `GET http://localhost:3000/api/nodes`
- `GET http://localhost:3000/api/nodes/abc-123`
- `POST http://localhost:3000/api/nodes`
- `GET http://localhost:3000/api/nodes/statistics/overview`

---

## Authentication Flow

### 1. Login (Public Route)
```typescript
// auth.controller.ts
@Controller('auth')
export class AuthController {
  
  @Public()  // ← Bypass global JWT guard
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
    // Returns: { accessToken: 'jwt-token-here', user: {...} }
  }
}
```

**Request:**
```bash
POST /api/auth/login
{
  "email": "diki@iot.local",
  "password": "password123"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "uuid",
    "email": "diki@iot.local",
    "name": "Diki",
    "role": "tenant",
    "idOwner": "owner-uuid-123"
  }
}
```

---

### 2. Protected Routes (Auto-Authenticated)

Semua routes **selain yang pakai `@Public()`** otomatis require authentication:

```typescript
// nodes.controller.ts
@Controller('nodes')
export class NodesController {
  
  @Get()  // ← Protected by global guard
  findAll(@Request() req: any) {
    // req.user tersedia karena JWT guard
    console.log(req.user);  
    // { userId, email, role, idOwner }
    
    const finalOwnerId = req.user?.role !== 'admin' && req.user?.idOwner 
      ? req.user.idOwner 
      : ownerId;
    
    return this.service.findAll({ ownerId: finalOwnerId });
  }
}
```

**Request:**
```bash
GET /api/nodes
Headers:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Without Token:**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**With Valid Token:**
- ✅ JWT guard validates token
- ✅ Extracts user payload
- ✅ Attaches to `req.user`
- ✅ Controller receives `req.user`
- ✅ Auto-filter by owner if not admin

---

## Tenant Filtering Logic

### Controller Implementation

```typescript
@Get()
findAll(
  @Request() req: any,  // ← req.user populated by JWT guard
  @Query('ownerId') ownerId?: string,
) {
  // Auto-filter for non-admin users
  const finalOwnerId = req.user?.role !== 'admin' && req.user?.idOwner 
    ? req.user.idOwner    // ← Force tenant's owner
    : ownerId;            // ← Admin can specify any or null
  
  console.log('User:', req.user.email, 'Role:', req.user.role);
  console.log('Final ownerId used for filtering:', finalOwnerId);
  
  return this.nodesService.findAll({ ownerId: finalOwnerId, ... });
}
```

### Behavior by Role

#### Admin User (role = 'admin', idOwner = null)
```typescript
req.user = { userId: 'xxx', email: 'admin@example.com', role: 'admin', idOwner: null }

// Request: GET /api/nodes
finalOwnerId = undefined  // ← No filter, see ALL nodes

// Request: GET /api/nodes?ownerId=abc-123
finalOwnerId = 'abc-123'  // ← Filter by specified owner
```

#### Tenant User (role = 'tenant', idOwner = 'abc-123')
```typescript
req.user = { userId: 'xxx', email: 'diki@iot.local', role: 'tenant', idOwner: 'abc-123' }

// Request: GET /api/nodes
finalOwnerId = 'abc-123'  // ← Auto-filtered by user's owner

// Request: GET /api/nodes?ownerId=different-owner
finalOwnerId = 'abc-123'  // ← STILL user's owner (cannot bypass!)
```

---

## Module Registration

Modules are registered in `app.module.ts`:

```typescript
@Module({
  imports: [
    AuthModule,        // → /api/auth/*
    NodesModule,       // → /api/nodes/*
    ProjectsModule,    // → /api/projects/*
    OwnersModule,      // → /api/owners/*
    // ...
  ],
})
```

Each module contains:
- Controller (handles routes)
- Service (business logic)
- Repository (database access)

---

## Testing

### Start Backend
```bash
cd iot-backend
npm run start:dev
```

### Test Flow

1. **Login** (No token needed)
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"diki@iot.local","password":"password123"}'
```

2. **Get Nodes** (Token required)
```bash
curl -X GET http://localhost:3000/api/nodes?page=1&limit=10 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

3. **Check Console Logs**
```
User: diki@iot.local Role: tenant
Final ownerId used for filtering: abc-123
```

---

## Public Routes

Mark routes as public with `@Public()` decorator:

```typescript
import { Public } from '../auth/decorators/public.decorator';

@Controller('health')
export class HealthController {
  
  @Public()  // ← Accessible without token
  @Get()
  check() {
    return { status: 'ok' };
  }
}
```

**Public routes in system:**
- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/refresh`
- `GET /api/health` (if exists)

---

## Summary

✅ **Global Auth Guard Applied**
- All routes protected by default
- `req.user` available in all controllers
- Login/register endpoints remain public

✅ **NestJS Routing**
- No separate router files needed
- Routes defined via `@Controller()` and `@Get/@Post/@Patch/@Delete()`
- Automatic URL generation

✅ **Tenant Filtering**
- Simple controller-level logic
- Check `req.user.role` and `req.user.idOwner`
- Force ownerId for non-admin users

✅ **Secure by Design**
- Cannot bypass authentication
- Cannot bypass owner filter (for tenants)
- Logged for debugging

---

## Next Steps

1. Restart backend: `npm run start:dev`
2. Login as tenant user
3. Call nodes API
4. Check console logs for filtering
5. Verify total nodes reduced (only tenant's owner data)
