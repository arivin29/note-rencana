# 🚀 Quick Reference - IoT Backend API

## 📁 Project Structure
```
src/
├── entities/                    ← All 18 TypeORM entities
│   └── index.ts                ← Centralized export
├── common/dto/                 ← Shared DTOs
│   ├── query.dto.ts            ← Pagination params
│   └── paginated-response.dto.ts
├── modules/
│   └── owners/                 ← Example module (complete)
│       ├── dto/                ← 5 DTOs per module
│       ├── owners.service.ts   ← Business logic
│       ├── owners.controller.ts ← REST endpoints
│       └── owners.module.ts    ← Module config
├── database/
│   ├── data-source.ts          ← TypeORM config
│   ├── migrations/             ← DB migrations
│   └── seeds/                  ← Seed data
├── main.ts                     ← App entry + Swagger
└── app.module.ts               ← Root module
```

## 🔧 Common Commands

### Development
```bash
npm run start:dev         # Start with hot reload
npm run build             # Build for production
npm run start:prod        # Run production build
```

### Database
```bash
npm run migration:generate -- name    # Generate migration
npm run migration:run                 # Run migrations
npm run migration:revert              # Revert last migration
npm run seed                          # Seed database
```

### Testing
```bash
npm run test              # Unit tests
npm run test:e2e          # E2E tests
npm run test:cov          # Coverage report
```

## 📝 Creating a New Module

### Step 1: Create Module Structure
```bash
mkdir -p src/modules/projects/dto
touch src/modules/projects/projects.service.ts
touch src/modules/projects/projects.controller.ts
touch src/modules/projects/projects.module.ts
```

### Step 2: Create DTOs (5 files)
```typescript
// dto/create-project.dto.ts
export class CreateProjectDto {
  @IsString() @IsNotEmpty()
  name: string;
  
  @IsUUID()
  idOwner: string;
}

// dto/update-project.dto.ts
export class UpdateProjectDto extends PartialType(CreateProjectDto) {}

// dto/project-response.dto.ts (Type 1 - Simple)
export class ProjectResponseDto {
  idProject: string;
  name: string;
  status: string;
}

// dto/project-detail-response.dto.ts (Type 2 - Nested)
export class ProjectDetailResponseDto extends ProjectResponseDto {
  owner: OwnerResponseDto;
  nodes: NodeSummaryDto[];
  statistics: ProjectStatisticsDto;
}

// dto/project-statistics-response.dto.ts (Type 3 - Aggregated)
export class ProjectStatisticsResponseDto {
  totalProjects: number;
  byStatus: Array<{status: string; count: number}>;
  topProjects: Array<{...}>;
}
```

### Step 3: Implement Service (3 Operation Types)
```typescript
@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
  ) {}

  // TYPE 1: Simple CRUD
  async create(dto: CreateProjectDto): Promise<ProjectResponseDto> { }
  async findAll(query: QueryDto): Promise<PaginatedResponseDto<ProjectResponseDto>> { }
  async findOne(id: string): Promise<ProjectResponseDto> { }
  async update(id: string, dto: UpdateProjectDto): Promise<ProjectResponseDto> { }
  async remove(id: string): Promise<void> { }

  // TYPE 2: Nested Data
  async findOneWithDetails(id: string): Promise<ProjectDetailResponseDto> {
    return this.projectsRepository.findOne({
      where: { idProject: id },
      relations: ['owner', 'nodes', 'nodes.sensors'],
    });
  }

  // TYPE 3: Aggregations
  async getStatistics(): Promise<ProjectStatisticsResponseDto> {
    const total = await this.projectsRepository.count();
    const byStatus = await this.projectsRepository
      .createQueryBuilder('project')
      .select('project.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('project.status')
      .getRawMany();
    // ... more aggregations
  }
}
```

### Step 4: Implement Controller
```typescript
@ApiTags('Projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create project' })
  @ApiResponse({ status: 201, type: ProjectResponseDto })
  async create(@Body() dto: CreateProjectDto) { }

  @Get()
  @ApiOperation({ summary: 'List projects' })
  async findAll(@Query() query: QueryDto) { }

  @Get(':id/detail')
  @ApiOperation({ summary: 'Get project with details' })
  @ApiResponse({ status: 200, type: ProjectDetailResponseDto })
  async findOneDetailed(@Param('id') id: string) { }

  @Get('statistics/overview')
  @ApiOperation({ summary: 'Get project statistics' })
  @ApiResponse({ status: 200, type: ProjectStatisticsResponseDto })
  async getStatistics() { }
}
```

### Step 5: Create Module
```typescript
@Module({
  imports: [TypeOrmModule.forFeature([Project])],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
```

### Step 6: Register in App Module
```typescript
// app.module.ts
import { ProjectsModule } from './modules/projects/projects.module';

@Module({
  imports: [
    // ... other imports
    ProjectsModule,
  ],
})
export class AppModule {}
```

## 🎯 Endpoint Patterns

### Standard CRUD
```
POST   /api/{resource}              Create
GET    /api/{resource}              List (paginated)
GET    /api/{resource}/:id          Get by ID (simple)
PATCH  /api/{resource}/:id          Update
DELETE /api/{resource}/:id          Delete
```

### Nested Data
```
GET    /api/{resource}/:id/detail           Full details + relations
GET    /api/{parent}/:id/{child}            Related resources
GET    /api/{resource}/:id/dashboard        Dashboard data
```

### Aggregations
```
GET    /api/{resource}/statistics/overview  All stats
GET    /api/{resource}/:id/reports/monthly  Time-based reports
GET    /api/{resource}/reports/widgets      Widget data
```

## 🔍 Query Parameters

### Pagination
```
?page=1&limit=10
```

### Filtering
```
?search=keyword
?status=active
?createdFrom=2025-01-01&createdTo=2025-12-31
```

### Sorting
```
?sortBy=createdAt&sortOrder=DESC
```

### Combined
```
?page=2&limit=25&search=water&sortBy=name&sortOrder=ASC
```

## 📚 Swagger Annotations

### Common Decorators
```typescript
@ApiTags('Resource')                    // Group endpoints
@ApiOperation({ summary: 'Description' }) // Endpoint description
@ApiResponse({ status: 200, type: Dto })  // Response schema
@ApiParam({ name: 'id', description: '' }) // Path parameter
@ApiQuery({ name: 'page', required: false }) // Query parameter
@ApiBody({ type: CreateDto })            // Request body
@ApiBearerAuth()                         // Requires auth token
```

### DTO Decorators
```typescript
@ApiProperty({ description: 'Field description', example: 'value' })
@ApiPropertyOptional({ description: 'Optional field' })
```

## 🗄️ TypeORM Patterns

### Basic Query
```typescript
const items = await repository.find();
const item = await repository.findOne({ where: { id } });
```

### With Relations
```typescript
const item = await repository.findOne({
  where: { id },
  relations: ['owner', 'projects', 'projects.nodes'],
});
```

### Query Builder (Complex Queries)
```typescript
const result = await repository
  .createQueryBuilder('entity')
  .leftJoin('entity.relation', 'relation')
  .where('entity.status = :status', { status: 'active' })
  .andWhere('entity.name ILIKE :search', { search: `%${search}%` })
  .orderBy('entity.createdAt', 'DESC')
  .skip((page - 1) * limit)
  .take(limit)
  .getManyAndCount();
```

### Aggregations
```typescript
const stats = await repository
  .createQueryBuilder('entity')
  .select('entity.category', 'category')
  .addSelect('COUNT(*)', 'count')
  .addSelect('AVG(entity.value)', 'average')
  .groupBy('entity.category')
  .getRawMany();
```

## 🎨 Response Formats

### Simple Response (Type 1)
```json
{
  "idResource": "uuid",
  "name": "Resource Name",
  "status": "active",
  "createdAt": "2025-11-11T...",
  "updatedAt": "2025-11-11T..."
}
```

### Paginated Response
```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

### Nested Response (Type 2)
```json
{
  "idResource": "uuid",
  "name": "Resource Name",
  "relatedResource": {
    "id": "uuid",
    "name": "Related Name"
  },
  "items": [
    { "id": "uuid", "name": "Item 1" }
  ],
  "statistics": {
    "totalItems": 50,
    "activeItems": 45
  }
}
```

### Aggregated Response (Type 3)
```json
{
  "totalCount": 1000,
  "byCategory": [
    { "category": "A", "count": 500, "percentage": 50 }
  ],
  "topItems": [
    { "id": "uuid", "name": "Top Item", "score": 100 }
  ],
  "trends": [...]
}
```

## 🚨 Error Responses

### Standard Error Format
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

### Validation Error
```json
{
  "statusCode": 400,
  "message": [
    "name should not be empty",
    "email must be an email"
  ],
  "error": "Bad Request"
}
```

## 🔐 Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=iot
DB_SSL=false

# Application
PORT=3000
NODE_ENV=development
```

## 📊 Useful Queries

### Count Records
```typescript
const count = await repository.count();
const countWithCondition = await repository.count({ 
  where: { status: 'active' } 
});
```

### Exists Check
```typescript
const exists = await repository.exist({ 
  where: { email: 'test@example.com' } 
});
```

### Soft Delete
```typescript
await repository.softDelete(id);
await repository.restore(id);
```

### Bulk Operations
```typescript
await repository.insert([dto1, dto2, dto3]);
await repository.update({ status: 'old' }, { status: 'new' });
await repository.delete({ createdAt: LessThan(oldDate) });
```

## 🎯 Module Checklist

When creating a new module, ensure:

- [ ] Entity file exists in `src/entities/`
- [ ] Entity exported in `src/entities/index.ts`
- [ ] Created 5 DTOs (create, update, response, detail, statistics)
- [ ] Created service with 3 operation types
- [ ] Created controller with Swagger decorators
- [ ] Created module file
- [ ] Registered module in `app.module.ts`
- [ ] Added tests (optional but recommended)
- [ ] Updated API documentation
- [ ] Tested all endpoints

## 🔗 Quick Links

- **Swagger UI:** http://localhost:3000/api
- **TypeORM Docs:** https://typeorm.io
- **NestJS Docs:** https://docs.nestjs.com
- **Swagger Decorator Docs:** https://docs.nestjs.com/openapi/introduction

---

**Remember:** Follow the Owners module as your template! 🎯
