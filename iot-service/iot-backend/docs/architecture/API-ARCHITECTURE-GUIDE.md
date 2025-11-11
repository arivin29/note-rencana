# IoT Backend API Architecture Guide

## 🏗️ **Complete Architecture Overview**

### **Layer Structure**
```
┌─────────────────────────────────────────┐
│   Controller Layer (HTTP/REST API)      │ ← Swagger Docs, Validation
├─────────────────────────────────────────┤
│   DTO Layer (Request/Response)          │ ← Transformation, Serialization
├─────────────────────────────────────────┤
│   Service Layer (Business Logic)        │ ← CRUD + Custom Logic
├─────────────────────────────────────────┤
│   Repository Layer (Data Access)        │ ← TypeORM Queries
├─────────────────────────────────────────┤
│   Entity Layer (Database Models)        │ ← Tables, Relations
└─────────────────────────────────────────┘
```

---

## 📋 **DTO Strategy - 3 Response Types**

### **Type 1: Simple Response (Single Row, No Relations)**
Untuk GET by ID tanpa nested data
```typescript
// owners/dto/owner-response.dto.ts
export class OwnerResponseDto {
  @ApiProperty()
  idOwner: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  industry: string;

  @ApiProperty()
  contactPerson: string;

  @ApiProperty()
  slaLevel: string;

  @ApiProperty()
  createdAt: Date;
  
  @ApiProperty()
  updatedAt: Date;
}
```

**Endpoint:** `GET /owners/:id`
```typescript
@Get(':id')
@ApiOperation({ summary: 'Get owner by ID (basic info)' })
@ApiResponse({ type: OwnerResponseDto })
async findOne(@Param('id') id: string): Promise<OwnerResponseDto> {
  return this.ownersService.findOne(id);
}
```

---

### **Type 2: Nested Response (With Relations)**
Untuk GET detail dengan JOIN tables
```typescript
// owners/dto/owner-detail-response.dto.ts
export class OwnerDetailResponseDto {
  @ApiProperty()
  idOwner: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  industry: string;

  @ApiProperty()
  contactPerson: string;

  @ApiProperty({ type: () => [ProjectResponseDto] })
  projects: ProjectResponseDto[];

  @ApiProperty({ type: () => [NodeAssignmentResponseDto] })
  nodeAssignments: NodeAssignmentResponseDto[];

  @ApiProperty()
  statistics: {
    totalProjects: number;
    totalNodes: number;
    activeSensors: number;
  };

  @ApiProperty()
  createdAt: Date;
  
  @ApiProperty()
  updatedAt: Date;
}
```

**Endpoint:** `GET /owners/:id/detail`
```typescript
@Get(':id/detail')
@ApiOperation({ summary: 'Get owner with full details (nested data)' })
@ApiResponse({ type: OwnerDetailResponseDto })
async findOneDetailed(@Param('id') id: string): Promise<OwnerDetailResponseDto> {
  return this.ownersService.findOneWithDetails(id);
}
```

---

### **Type 3: Aggregated Response (Reports/Statistics)**
Untuk dashboard widgets dan reports
```typescript
// owners/dto/owner-statistics-response.dto.ts
export class OwnerStatisticsResponseDto {
  @ApiProperty()
  totalOwners: number;

  @ApiProperty()
  ownersByIndustry: Array<{
    industry: string;
    count: number;
    percentage: number;
  }>;

  @ApiProperty()
  ownersBySlaLevel: Array<{
    slaLevel: string;
    count: number;
  }>;

  @ApiProperty()
  topOwnersByProjects: Array<{
    idOwner: string;
    name: string;
    projectCount: number;
    nodeCount: number;
  }>;

  @ApiProperty()
  recentActivity: Array<{
    idOwner: string;
    name: string;
    lastActivity: Date;
    action: string;
  }>;
}
```

**Endpoint:** `GET /owners/statistics`
```typescript
@Get('statistics')
@ApiOperation({ summary: 'Get owners aggregated statistics' })
@ApiResponse({ type: OwnerStatisticsResponseDto })
async getStatistics(): Promise<OwnerStatisticsResponseDto> {
  return this.ownersService.getStatistics();
}
```

---

## 🎯 **Complete Controller Pattern**

### **owners.controller.ts**
```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { OwnersService } from './owners.service';
import { CreateOwnerDto } from './dto/create-owner.dto';
import { UpdateOwnerDto } from './dto/update-owner.dto';
import { OwnerResponseDto } from './dto/owner-response.dto';
import { OwnerDetailResponseDto } from './dto/owner-detail-response.dto';
import { OwnerStatisticsResponseDto } from './dto/owner-statistics-response.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { QueryDto } from '../../common/dto/query.dto';

@ApiTags('Owners')
@ApiBearerAuth()
@Controller('owners')
export class OwnersController {
  constructor(private readonly ownersService: OwnersService) {}

  // ============================================
  // STANDARD CRUD OPERATIONS
  // ============================================

  @Post()
  @ApiOperation({ summary: 'Create a new owner' })
  @ApiResponse({ status: 201, type: OwnerResponseDto })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createOwnerDto: CreateOwnerDto): Promise<OwnerResponseDto> {
    return this.ownersService.create(createOwnerDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all owners (with pagination and filters)' })
  @ApiResponse({ status: 200, type: PaginatedResponseDto })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'industry', required: false, type: String })
  @ApiQuery({ name: 'slaLevel', required: false, type: String })
  async findAll(@Query() query: QueryDto): Promise<PaginatedResponseDto<OwnerResponseDto>> {
    return this.ownersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get owner by ID (basic info only)' })
  @ApiResponse({ status: 200, type: OwnerResponseDto })
  async findOne(@Param('id') id: string): Promise<OwnerResponseDto> {
    return this.ownersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update owner' })
  @ApiResponse({ status: 200, type: OwnerResponseDto })
  async update(
    @Param('id') id: string,
    @Body() updateOwnerDto: UpdateOwnerDto,
  ): Promise<OwnerResponseDto> {
    return this.ownersService.update(id, updateOwnerDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete owner' })
  @ApiResponse({ status: 204 })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    return this.ownersService.remove(id);
  }

  // ============================================
  // NESTED DATA ENDPOINTS (Type 2)
  // ============================================

  @Get(':id/detail')
  @ApiOperation({ summary: 'Get owner with full details and nested relations' })
  @ApiResponse({ status: 200, type: OwnerDetailResponseDto })
  async findOneDetailed(@Param('id') id: string): Promise<OwnerDetailResponseDto> {
    return this.ownersService.findOneWithDetails(id);
  }

  @Get(':id/projects')
  @ApiOperation({ summary: 'Get all projects for an owner' })
  @ApiResponse({ status: 200, type: [ProjectResponseDto] })
  async getOwnerProjects(@Param('id') id: string) {
    return this.ownersService.getOwnerProjects(id);
  }

  @Get(':id/nodes')
  @ApiOperation({ summary: 'Get all nodes for an owner' })
  @ApiResponse({ status: 200 })
  async getOwnerNodes(@Param('id') id: string) {
    return this.ownersService.getOwnerNodes(id);
  }

  // ============================================
  // AGGREGATION & REPORTS (Type 3)
  // ============================================

  @Get('statistics/overview')
  @ApiOperation({ summary: 'Get aggregated statistics for all owners' })
  @ApiResponse({ status: 200, type: OwnerStatisticsResponseDto })
  async getStatistics(): Promise<OwnerStatisticsResponseDto> {
    return this.ownersService.getStatistics();
  }

  @Get(':id/dashboard')
  @ApiOperation({ summary: 'Get dashboard data for owner' })
  @ApiResponse({ status: 200 })
  async getOwnerDashboard(@Param('id') id: string) {
    return this.ownersService.getOwnerDashboard(id);
  }

  @Get(':id/reports/monthly')
  @ApiOperation({ summary: 'Get monthly report for owner' })
  @ApiQuery({ name: 'year', required: true, type: Number })
  @ApiQuery({ name: 'month', required: true, type: Number })
  @ApiResponse({ status: 200 })
  async getMonthlyReport(
    @Param('id') id: string,
    @Query('year') year: number,
    @Query('month') month: number,
  ) {
    return this.ownersService.getMonthlyReport(id, year, month);
  }

  @Get('reports/widgets')
  @ApiOperation({ summary: 'Get data for dashboard widgets' })
  @ApiResponse({ status: 200 })
  async getWidgetsData() {
    return this.ownersService.getWidgetsData();
  }
}
```

---

## 🔧 **Service Implementation Pattern**

### **owners.service.ts**
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Owner } from '../../entities/owner.entity';
import { CreateOwnerDto } from './dto/create-owner.dto';
import { UpdateOwnerDto } from './dto/update-owner.dto';
import { OwnerResponseDto } from './dto/owner-response.dto';
import { OwnerDetailResponseDto } from './dto/owner-detail-response.dto';
import { OwnerStatisticsResponseDto } from './dto/owner-statistics-response.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { QueryDto } from '../../common/dto/query.dto';

@Injectable()
export class OwnersService {
  constructor(
    @InjectRepository(Owner)
    private ownersRepository: Repository<Owner>,
  ) {}

  // ============================================
  // STANDARD CRUD (Type 1 - Simple)
  // ============================================

  async create(createOwnerDto: CreateOwnerDto): Promise<OwnerResponseDto> {
    const owner = this.ownersRepository.create(createOwnerDto);
    const saved = await this.ownersRepository.save(owner);
    return this.toResponseDto(saved);
  }

  async findAll(query: QueryDto): Promise<PaginatedResponseDto<OwnerResponseDto>> {
    const { page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'DESC' } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.ownersRepository.createQueryBuilder('owner');

    // Apply search filter
    if (search) {
      queryBuilder.where(
        'owner.name ILIKE :search OR owner.industry ILIKE :search',
        { search: `%${search}%` },
      );
    }

    // Apply sorting
    queryBuilder.orderBy(`owner.${sortBy}`, sortOrder as 'ASC' | 'DESC');

    // Apply pagination
    queryBuilder.skip(skip).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      data: items.map((item) => this.toResponseDto(item)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<OwnerResponseDto> {
    const owner = await this.ownersRepository.findOne({
      where: { idOwner: id },
    });

    if (!owner) {
      throw new NotFoundException(`Owner with ID ${id} not found`);
    }

    return this.toResponseDto(owner);
  }

  async update(id: string, updateOwnerDto: UpdateOwnerDto): Promise<OwnerResponseDto> {
    await this.findOne(id); // Check if exists
    await this.ownersRepository.update(id, updateOwnerDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.ownersRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Owner with ID ${id} not found`);
    }
  }

  // ============================================
  // NESTED DATA QUERIES (Type 2)
  // ============================================

  async findOneWithDetails(id: string): Promise<OwnerDetailResponseDto> {
    const owner = await this.ownersRepository.findOne({
      where: { idOwner: id },
      relations: ['projects', 'projects.nodes', 'nodeAssignments'],
    });

    if (!owner) {
      throw new NotFoundException(`Owner with ID ${id} not found`);
    }

    // Calculate statistics
    const statistics = {
      totalProjects: owner.projects?.length || 0,
      totalNodes: owner.projects?.reduce((sum, p) => sum + (p.nodes?.length || 0), 0) || 0,
      activeSensors: 0, // Calculate from nodes
    };

    return {
      ...this.toResponseDto(owner),
      projects: owner.projects || [],
      nodeAssignments: owner.nodeAssignments || [],
      statistics,
    };
  }

  async getOwnerProjects(id: string) {
    const owner = await this.ownersRepository.findOne({
      where: { idOwner: id },
      relations: ['projects', 'projects.nodes'],
    });

    if (!owner) {
      throw new NotFoundException(`Owner with ID ${id} not found`);
    }

    return owner.projects;
  }

  async getOwnerNodes(id: string) {
    const owner = await this.ownersRepository.findOne({
      where: { idOwner: id },
      relations: ['projects', 'projects.nodes', 'projects.nodes.sensors'],
    });

    if (!owner) {
      throw new NotFoundException(`Owner with ID ${id} not found`);
    }

    return owner.projects?.flatMap((p) => p.nodes) || [];
  }

  // ============================================
  // AGGREGATIONS & REPORTS (Type 3)
  // ============================================

  async getStatistics(): Promise<OwnerStatisticsResponseDto> {
    const totalOwners = await this.ownersRepository.count();

    // Group by industry
    const ownersByIndustry = await this.ownersRepository
      .createQueryBuilder('owner')
      .select('owner.industry', 'industry')
      .addSelect('COUNT(*)', 'count')
      .groupBy('owner.industry')
      .getRawMany();

    // Group by SLA level
    const ownersBySlaLevel = await this.ownersRepository
      .createQueryBuilder('owner')
      .select('owner.slaLevel', 'slaLevel')
      .addSelect('COUNT(*)', 'count')
      .groupBy('owner.slaLevel')
      .getRawMany();

    // Top owners by projects
    const topOwners = await this.ownersRepository
      .createQueryBuilder('owner')
      .leftJoinAndSelect('owner.projects', 'project')
      .leftJoinAndSelect('project.nodes', 'node')
      .select([
        'owner.idOwner',
        'owner.name',
        'COUNT(DISTINCT project.idProject) as projectCount',
        'COUNT(DISTINCT node.idNode) as nodeCount',
      ])
      .groupBy('owner.idOwner')
      .orderBy('projectCount', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      totalOwners,
      ownersByIndustry: ownersByIndustry.map((item) => ({
        industry: item.industry || 'Unknown',
        count: parseInt(item.count),
        percentage: (parseInt(item.count) / totalOwners) * 100,
      })),
      ownersBySlaLevel: ownersBySlaLevel.map((item) => ({
        slaLevel: item.slaLevel || 'None',
        count: parseInt(item.count),
      })),
      topOwnersByProjects: topOwners,
      recentActivity: [], // Implement activity tracking
    };
  }

  async getOwnerDashboard(id: string) {
    const owner = await this.findOneWithDetails(id);

    return {
      owner: {
        id: owner.idOwner,
        name: owner.name,
        industry: owner.industry,
      },
      summary: owner.statistics,
      recentProjects: owner.projects?.slice(0, 5),
      recentAlerts: [], // Query from alert_events
      performanceMetrics: {}, // Calculate from sensor_logs
    };
  }

  async getMonthlyReport(id: string, year: number, month: number) {
    // Complex aggregation query for monthly report
    return {
      owner: await this.findOne(id),
      period: { year, month },
      metrics: {
        dataPoints: 0,
        alerts: 0,
        downtime: 0,
      },
      // More detailed report data
    };
  }

  async getWidgetsData() {
    return {
      totalOwners: await this.ownersRepository.count(),
      activeOwners: await this.ownersRepository.count({
        // Add conditions for active
      }),
      byIndustry: await this.getStatistics().then((s) => s.ownersByIndustry),
      bySlaLevel: await this.getStatistics().then((s) => s.ownersBySlaLevel),
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private toResponseDto(owner: Owner): OwnerResponseDto {
    return {
      idOwner: owner.idOwner,
      name: owner.name,
      industry: owner.industry,
      contactPerson: owner.contactPerson,
      slaLevel: owner.slaLevel,
      createdAt: owner.createdAt,
      updatedAt: owner.updatedAt,
    };
  }
}
```

---

## 📝 **Common DTOs**

### **common/dto/query.dto.ts**
```typescript
import { IsOptional, IsInt, Min, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
```

### **common/dto/paginated-response.dto.ts**
```typescript
import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

export class PaginatedResponseDto<T> {
  @ApiProperty({ isArray: true })
  data: T[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
```

---

## 🚀 **Setup Swagger**

### **main.ts**
```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors();

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('IoT Monitoring API')
    .setDescription('Complete IoT monitoring system API with nested data and aggregations')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Owners', 'Owner management endpoints')
    .addTag('Projects', 'Project management endpoints')
    .addTag('Nodes', 'Node management endpoints')
    .addTag('Sensors', 'Sensor management endpoints')
    .addTag('Telemetry', 'Telemetry data endpoints')
    .addTag('Dashboards', 'Dashboard and widgets endpoints')
    .addTag('Reports', 'Reports and analytics endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/api`);
}
bootstrap();
```

---

## 📋 **Implementation Checklist**

### Phase 1: Setup
- [ ] Install dependencies: `@nestjs/swagger swagger-ui-express class-validator class-transformer`
- [ ] Create all entity files
- [ ] Create entities/index.ts export file
- [ ] Update data-source.ts

### Phase 2: Common Layer
- [ ] Create common/dto/query.dto.ts
- [ ] Create common/dto/paginated-response.dto.ts
- [ ] Create common/dto/response.dto.ts

### Phase 3: Owners Module (Example)
- [ ] Create owners module structure
- [ ] Create all DTOs (create, update, response, detail, statistics)
- [ ] Implement service with 3 types of queries
- [ ] Implement controller with proper Swagger docs
- [ ] Test all endpoints

### Phase 4: Repeat for Other Modules
- [ ] Projects module
- [ ] Nodes module
- [ ] Sensors module
- [ ] Telemetry module
- [ ] Dashboards module

### Phase 5: Advanced Features
- [ ] Add authentication/authorization
- [ ] Add rate limiting
- [ ] Add caching (Redis)
- [ ] Add logging
- [ ] Add error handling middleware

---

## 🎯 **Next Steps**

Would you like me to:
1. ✅ Generate all entity files with complete code
2. ✅ Create one complete module (Owners) as example
3. ✅ Setup Swagger configuration
4. ✅ Create CLI commands for generating modules

Let me know which one to start with!
