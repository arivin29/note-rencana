# AI Assistant Quick Start Guide

**For:** Starting new chat sessions with full project context  
**Purpose:** Enable AI to help immediately without re-learning project

---

## 📋 How to Use This Context

### 1. **At Start of New Chat:**
Attach these files to the AI:
- ✅ `PROJECT-CONTEXT.md` (this is the main one!)
- ✅ Recent work summaries (optional):
  - `NODE-MODELS-SDK-MIGRATION.md`
  - `PHASE9-USER-MANAGEMENT-COMPLETE.md`
  - `PM2-DEPLOYMENT-GUIDE.md`

### 2. **Key Information to Reference:**

#### Project Structure:
```
iot-service/
├── iot-angular/    # Angular 20 frontend
├── iot-backend/    # NestJS backend  
└── iot-gtw/       # MQTT gateway
```

#### Tech Stack:
- Frontend: Angular 20 + TypeScript + Bootstrap
- Backend: NestJS + PostgreSQL + TypeORM
- SDK: Auto-generated via `ng-openapi-gen`

#### Important Patterns:
- All API calls use SDK from `src/sdk/core/`
- Observable pattern for HTTP requests
- DTOs for type safety
- JWT authentication

---

## 🎯 Common User Requests

### Frontend Tasks:

**1. "Migrate page X from dummy data to SDK"**
```typescript
// Steps:
1. Import SDK service & models
2. Add loading/error state
3. Implement ngOnInit() → loadData()
4. Subscribe to service call
5. Update template with *ngIf states
```

**2. "Add CRUD for module X"**
```typescript
// Pattern:
- List: serviceX.xControllerFindAll({})
- Create: serviceX.xControllerCreate({ body: dto })
- Update: serviceX.xControllerUpdate({ id, body: dto })
- Delete: serviceX.xControllerRemove({ id })
```

**3. "Fix TypeScript errors"**
```typescript
// Common fixes:
- Import from 'src/sdk/core/models'
- Use DTO types (e.g., UserResponseDto)
- Add missing properties to interfaces
- Check nullable fields (field?: type)
```

### Backend Tasks:

**1. "Create new module X"**
```bash
cd iot-backend
nest g module modules/x
nest g controller modules/x
nest g service modules/x
# Then create DTOs, entities, etc.
```

**2. "Add new endpoint"**
```typescript
// Controller:
@Get()
@ApiOperation({ summary: 'Get all X' })
findAll() { return this.xService.findAll(); }

// Service:
async findAll() { 
  return this.xRepository.find(); 
}
```

**3. "Add migration"**
```bash
npm run typeorm -- migration:create src/database/migrations/AddColumnX
# Edit migration file
npm run migration:run
```

### Full-Stack Tasks:

**1. "Add new feature end-to-end"**
```
1. Backend: Entity → DTO → Service → Controller
2. Generate SDK: npm run generate-api
3. Frontend: Import SDK → Create component → Wire up
4. Test: localhost:3000/api + localhost:4200
```

**2. "Deploy changes"**
```bash
# Frontend
cd iot-angular
npm run build
firebase deploy --only hosting:devetek-helios

# Backend
cd iot-backend
git pull
npm run build
pm2 restart iot-backend
```

---

## 🔍 Debugging Checklist

### Frontend Issues:
- [ ] Check browser console (F12)
- [ ] Check Network tab for API calls
- [ ] Verify SDK imports are correct
- [ ] Check component is in module declarations
- [ ] Verify router config

### Backend Issues:
- [ ] Check PM2 logs: `pm2 logs iot-backend`
- [ ] Test endpoint in Swagger UI
- [ ] Check database connection
- [ ] Verify .env variables
- [ ] Check CORS configuration

### SDK Issues:
- [ ] Backend must be running
- [ ] Check `http://localhost:3000/api-json` works
- [ ] Re-generate: `npm run generate-api`
- [ ] Check output in `src/sdk/core/`

---

## 📝 Code Patterns to Follow

### Frontend Component:
```typescript
import { Component, OnInit } from '@angular/core';
import { SomeService } from 'src/sdk/core/services';
import { SomeDto } from 'src/sdk/core/models';

@Component({
  selector: 'app-some',
  templateUrl: './some.html',
  standalone: false
})
export class SomePage implements OnInit {
  loading = false;
  errorMessage = '';
  data: SomeDto[] = [];

  constructor(private service: SomeService) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.service.someControllerFindAll({}).subscribe({
      next: (res) => {
        const parsed = typeof res === 'string' ? JSON.parse(res) : res;
        this.data = parsed.data || parsed || [];
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.message;
        this.loading = false;
      }
    });
  }
}
```

### Backend Controller:
```typescript
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Some Module')
@Controller('some')
export class SomeController {
  constructor(private service: SomeService) {}

  @Get()
  @ApiOperation({ summary: 'Get all items' })
  @ApiResponse({ status: 200, type: [SomeResponseDto] })
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create item' })
  create(@Body() dto: CreateSomeDto) {
    return this.service.create(dto);
  }
}
```

---

## 🚨 Important Constraints

### DO:
- ✅ Use SDK types from `src/sdk/core/models`
- ✅ Follow Observable pattern
- ✅ Add loading & error states
- ✅ Use proper DTOs (Response vs Create vs Update)
- ✅ Include 3-5 lines context in file edits
- ✅ Check for TypeScript errors after edits

### DON'T:
- ❌ Edit files in `src/sdk/core/` (auto-generated)
- ❌ Use hardcoded data (always use SDK)
- ❌ Mix Promise and Observable patterns
- ❌ Forget to regenerate SDK after backend changes
- ❌ Make assumptions - check actual code first
- ❌ Edit without verifying file paths exist

---

## 📚 Key Files to Reference

### Frontend:
- `src/sdk/core/services/*.service.ts` - API services
- `src/sdk/core/models/*.ts` - DTOs
- `src/environments/environment.ts` - Config
- `ng-openapi-gen.json` - SDK config

### Backend:
- `src/main.ts` - App entry, CORS, port
- `src/modules/*/dto/*.dto.ts` - Data transfer objects
- `src/database/entities/*.entity.ts` - TypeORM entities
- `ecosystem.config.js` - PM2 config

---

## 🎓 Learning Resources

### Internal Docs:
- `iot-angular/docs/TEAM-SDK-GUIDE.md` - SDK usage patterns
- `iot-backend/docs/QUICK-REFERENCE.md` - Backend patterns
- `NODE-MODELS-SDK-MIGRATION.md` - Example migration

### External:
- Angular: https://angular.io/docs
- NestJS: https://docs.nestjs.com
- TypeORM: https://typeorm.io
- RxJS: https://rxjs.dev

---

## 💬 Communication Style

### When Helping User:

1. **Understand Context First**
   - Read attached files
   - Ask clarifying questions if needed
   - Check actual code before suggesting

2. **Provide Clear Solutions**
   - Show code snippets
   - Explain WHY, not just HOW
   - Use consistent patterns from project

3. **Be Thorough**
   - Include error handling
   - Add loading states
   - Consider edge cases
   - Test suggested solutions

4. **Document Changes**
   - Create summary docs
   - Update existing docs
   - Add code comments
   - List files modified

5. **Use Emojis Appropriately**
   - ✅ for completed tasks
   - 🔜 for TODO items
   - 🐛 for bugs
   - 🚀 for deployments
   - 📝 for documentation

---

## 🔄 Workflow Example

### Typical Session Flow:

```
1. User: "Migrate sensor types page to SDK"

2. AI Actions:
   ✓ Check backend has sensor-types module
   ✓ Verify SDK service exists
   ✓ Read current component code
   ✓ Identify changes needed
   ✓ Update component TypeScript
   ✓ Update HTML template
   ✓ Check for errors
   ✓ Create migration summary doc

3. AI Response:
   - "✅ Migration complete!"
   - Show code changes
   - List modified files
   - Provide testing steps
   - Create summary document
```

---

## 🎯 Success Criteria

A good AI session should:
- ✅ Solve user's problem completely
- ✅ Follow project patterns consistently
- ✅ Include proper error handling
- ✅ Add loading/error states
- ✅ Check for TypeScript errors
- ✅ Document changes made
- ✅ Provide testing instructions
- ✅ Be ready for production

---

**Ready to assist! 🤖**

Start new chat with `PROJECT-CONTEXT.md` attached.
