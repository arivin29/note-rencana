# 📋 05 - Backend Architecture

> **Document:** Backend Architecture (NestJS)  
> **Version:** 1.0.0  
> **Last Updated:** January 25, 2026

---

## 5.1 Module Structure

```
iot-backend/src/
├── modules/
│   ├── dashboards/                    # Dashboard CRUD
│   │   ├── dashboards.module.ts
│   │   ├── dashboards.controller.ts
│   │   ├── dashboards.service.ts
│   │   ├── entities/
│   │   │   ├── dashboard.entity.ts
│   │   │   └── dashboard-share.entity.ts
│   │   ├── dto/
│   │   │   ├── create-dashboard.dto.ts
│   │   │   ├── update-dashboard.dto.ts
│   │   │   ├── dashboard-response.dto.ts
│   │   │   ├── dashboard-query.dto.ts
│   │   │   ├── share-dashboard.dto.ts
│   │   │   └── duplicate-dashboard.dto.ts
│   │   └── interfaces/
│   │       ├── dashboard-settings.interface.ts
│   │       └── dashboard-layout.interface.ts
│   │
│   ├── widgets/                       # Widget CRUD
│   │   ├── widgets.module.ts
│   │   ├── widgets.controller.ts
│   │   ├── widgets.service.ts
│   │   ├── entities/
│   │   │   └── widget.entity.ts
│   │   ├── dto/
│   │   │   ├── create-widget.dto.ts
│   │   │   ├── update-widget.dto.ts
│   │   │   ├── widget-response.dto.ts
│   │   │   └── bulk-update-positions.dto.ts
│   │   ├── interfaces/
│   │   │   ├── widget-config.interface.ts
│   │   │   ├── data-source.interface.ts
│   │   │   └── grid-position.interface.ts
│   │   └── validators/
│   │       ├── widget-type.validator.ts
│   │       └── data-source.validator.ts
│   │
│   ├── widget-data/                   # Data fetching for widgets
│   │   ├── widget-data.module.ts
│   │   ├── widget-data.controller.ts
│   │   ├── widget-data.service.ts
│   │   ├── providers/
│   │   │   ├── sensor-data.provider.ts
│   │   │   ├── node-status.provider.ts
│   │   │   ├── alert-data.provider.ts
│   │   │   └── aggregation.provider.ts
│   │   ├── dto/
│   │   │   ├── query-data.dto.ts
│   │   │   └── data-response.dto.ts
│   │   └── interfaces/
│   │       └── data-provider.interface.ts
│   │
│   └── realtime/                      # WebSocket
│       ├── realtime.module.ts
│       ├── realtime.gateway.ts
│       ├── services/
│       │   ├── subscription.service.ts
│       │   └── broadcast.service.ts
│       └── dto/
│           ├── subscribe.dto.ts
│           └── widget-update.dto.ts
│
└── common/
    └── guards/
        └── dashboard-access.guard.ts
```

---

## 5.2 Module Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│                     Module Dependency Graph                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                      ┌──────────────────┐                       │
│                      │   AppModule      │                       │
│                      └────────┬─────────┘                       │
│                               │                                  │
│         ┌─────────────────────┼─────────────────────┐           │
│         │                     │                     │           │
│         ▼                     ▼                     ▼           │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ Dashboards   │    │  Widgets     │    │  Realtime    │      │
│  │   Module     │◄───│   Module     │◄───│   Module     │      │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘      │
│         │                   │                   │               │
│         │                   ▼                   │               │
│         │           ┌──────────────┐            │               │
│         │           │ WidgetData   │            │               │
│         │           │   Module     │◄───────────┘               │
│         │           └──────┬───────┘                            │
│         │                  │                                     │
│         │    ┌─────────────┼─────────────┐                      │
│         │    │             │             │                      │
│         ▼    ▼             ▼             ▼                      │
│  ┌────────────────────────────────────────────────────┐        │
│  │              Existing Modules                       │        │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │        │
│  │  │ Owners  │ │Projects │ │ Nodes   │ │ Sensors │  │        │
│  │  │ Module  │ │ Module  │ │ Module  │ │ Module  │  │        │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘  │        │
│  └────────────────────────────────────────────────────┘        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5.3 Dashboards Module

### Controller

```typescript
// src/modules/dashboards/dashboards.controller.ts

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardsService } from './dashboards.service';
import { CreateDashboardDto } from './dto/create-dashboard.dto';
import { UpdateDashboardDto } from './dto/update-dashboard.dto';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { ShareDashboardDto } from './dto/share-dashboard.dto';

@ApiTags('Dashboards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboards')
export class DashboardsController {
  constructor(private readonly dashboardsService: DashboardsService) {}

  // ==================== CRUD ====================

  @Get()
  @ApiOperation({ summary: 'Get list of dashboards' })
  findAll(@Query() query: DashboardQueryDto, @Request() req) {
    return this.dashboardsService.findAll(query, req.user);
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get dashboard templates' })
  getTemplates() {
    return this.dashboardsService.getTemplates();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get dashboard by ID with widgets' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.dashboardsService.findOne(id, req.user);
  }

  @Post()
  @ApiOperation({ summary: 'Create new dashboard' })
  create(@Body() dto: CreateDashboardDto, @Request() req) {
    return this.dashboardsService.create(dto, req.user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update dashboard' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDashboardDto,
    @Request() req,
  ) {
    return this.dashboardsService.update(id, dto, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete dashboard' })
  remove(@Param('id') id: string, @Request() req) {
    return this.dashboardsService.remove(id, req.user);
  }

  // ==================== Actions ====================

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate dashboard' })
  duplicate(@Param('id') id: string, @Request() req) {
    return this.dashboardsService.duplicate(id, req.user);
  }

  @Post('from-template/:templateId')
  @ApiOperation({ summary: 'Create dashboard from template' })
  createFromTemplate(
    @Param('templateId') templateId: string,
    @Body() dto: CreateDashboardDto,
    @Request() req,
  ) {
    return this.dashboardsService.createFromTemplate(templateId, dto, req.user);
  }

  // ==================== Sharing ====================

  @Get(':id/shares')
  @ApiOperation({ summary: 'Get dashboard shares' })
  getShares(@Param('id') id: string, @Request() req) {
    return this.dashboardsService.getShares(id, req.user);
  }

  @Post(':id/shares')
  @ApiOperation({ summary: 'Share dashboard' })
  share(
    @Param('id') id: string,
    @Body() dto: ShareDashboardDto,
    @Request() req,
  ) {
    return this.dashboardsService.share(id, dto, req.user);
  }

  @Delete(':id/shares/:shareId')
  @ApiOperation({ summary: 'Remove share' })
  removeShare(
    @Param('id') id: string,
    @Param('shareId') shareId: string,
    @Request() req,
  ) {
    return this.dashboardsService.removeShare(id, shareId, req.user);
  }
}
```

### Service

```typescript
// src/modules/dashboards/dashboards.service.ts

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dashboard } from './entities/dashboard.entity';
import { DashboardShare } from './entities/dashboard-share.entity';
import { Widget } from '../widgets/entities/widget.entity';
import { CreateDashboardDto } from './dto/create-dashboard.dto';
import { UpdateDashboardDto } from './dto/update-dashboard.dto';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

@Injectable()
export class DashboardsService {
  constructor(
    @InjectRepository(Dashboard)
    private dashboardRepo: Repository<Dashboard>,
    @InjectRepository(DashboardShare)
    private shareRepo: Repository<DashboardShare>,
    @InjectRepository(Widget)
    private widgetRepo: Repository<Widget>,
  ) {}

  async findAll(query: DashboardQueryDto, user: any) {
    const qb = this.dashboardRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.project', 'project')
      .leftJoin('d.widgets', 'widgets')
      .addSelect('COUNT(widgets.id_widget)', 'widgetCount');

    // Filter by owner (or shared)
    if (!user.isAdmin) {
      qb.leftJoin('d.shares', 'shares')
        .where('d.id_owner = :ownerId', { ownerId: user.idOwner })
        .orWhere('shares.shared_to_owner_id = :ownerId', { ownerId: user.idOwner })
        .orWhere('d.is_public = true');
    }

    // Filters
    if (query.idProject) {
      qb.andWhere('d.id_project = :idProject', { idProject: query.idProject });
    }

    if (query.search) {
      qb.andWhere('(d.name ILIKE :search OR d.description ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    if (query.isTemplate !== undefined) {
      qb.andWhere('d.is_template = :isTemplate', { isTemplate: query.isTemplate });
    }

    // Sorting
    qb.orderBy(`d.${query.sortBy || 'updated_at'}`, query.sortOrder || 'DESC');

    // Pagination
    qb.skip(query.skip || 0).take(query.take || 20);

    qb.groupBy('d.id_dashboard, project.id_project');

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page: Math.floor((query.skip || 0) / (query.take || 20)) + 1,
      pageSize: query.take || 20,
    };
  }

  async findOne(id: string, user: any) {
    const dashboard = await this.dashboardRepo.findOne({
      where: { idDashboard: id },
      relations: ['widgets', 'project', 'owner'],
    });

    if (!dashboard) {
      throw new NotFoundException('Dashboard not found');
    }

    // Check access
    await this.checkAccess(dashboard, user, 'view');

    return dashboard;
  }

  async create(dto: CreateDashboardDto, user: any) {
    const dashboard = this.dashboardRepo.create({
      ...dto,
      idOwner: user.idOwner,
      createdBy: user.idUser,
      settings: dto.settings || {
        refreshInterval: 30,
        theme: 'light',
        timeRange: { type: 'relative', value: '1h' },
      },
      layout: dto.layout || {
        columns: 12,
        rowHeight: 50,
        margin: [10, 10],
      },
    });

    return this.dashboardRepo.save(dashboard);
  }

  async update(id: string, dto: UpdateDashboardDto, user: any) {
    const dashboard = await this.findOne(id, user);
    await this.checkAccess(dashboard, user, 'edit');

    Object.assign(dashboard, dto);
    return this.dashboardRepo.save(dashboard);
  }

  async remove(id: string, user: any) {
    const dashboard = await this.findOne(id, user);
    await this.checkAccess(dashboard, user, 'admin');

    await this.dashboardRepo.remove(dashboard);
    return { success: true };
  }

  async duplicate(id: string, user: any) {
    const original = await this.findOne(id, user);

    // Create new dashboard
    const newDashboard = this.dashboardRepo.create({
      ...original,
      idDashboard: undefined,
      name: `${original.name} (Copy)`,
      idOwner: user.idOwner,
      createdBy: user.idUser,
      isTemplate: false,
      isPublic: false,
      createdAt: undefined,
      updatedAt: undefined,
    });

    const saved = await this.dashboardRepo.save(newDashboard);

    // Duplicate widgets
    for (const widget of original.widgets) {
      const newWidget = this.widgetRepo.create({
        ...widget,
        idWidget: undefined,
        idDashboard: saved.idDashboard,
        createdAt: undefined,
        updatedAt: undefined,
      });
      await this.widgetRepo.save(newWidget);
    }

    return this.findOne(saved.idDashboard, user);
  }

  async getTemplates() {
    return this.dashboardRepo.find({
      where: { isTemplate: true },
      relations: ['widgets'],
      order: { name: 'ASC' },
    });
  }

  // ==================== Sharing ====================

  async share(id: string, dto: ShareDashboardDto, user: any) {
    const dashboard = await this.findOne(id, user);
    await this.checkAccess(dashboard, user, 'admin');

    const share = this.shareRepo.create({
      idDashboard: id,
      sharedToOwnerId: dto.sharedToOwnerId,
      permission: dto.permission || 'view',
      createdBy: user.idUser,
    });

    return this.shareRepo.save(share);
  }

  async getShares(id: string, user: any) {
    const dashboard = await this.findOne(id, user);
    await this.checkAccess(dashboard, user, 'admin');

    return this.shareRepo.find({
      where: { idDashboard: id },
      relations: ['sharedToOwner'],
    });
  }

  async removeShare(id: string, shareId: string, user: any) {
    const dashboard = await this.findOne(id, user);
    await this.checkAccess(dashboard, user, 'admin');

    await this.shareRepo.delete(shareId);
    return { success: true };
  }

  // ==================== Access Control ====================

  private async checkAccess(
    dashboard: Dashboard,
    user: any,
    requiredLevel: 'view' | 'edit' | 'admin',
  ) {
    // Admin has full access
    if (user.isAdmin) return;

    // Owner has full access
    if (dashboard.idOwner === user.idOwner) return;

    // Public dashboards can be viewed
    if (dashboard.isPublic && requiredLevel === 'view') return;

    // Check shares
    const share = await this.shareRepo.findOne({
      where: {
        idDashboard: dashboard.idDashboard,
        sharedToOwnerId: user.idOwner,
      },
    });

    if (!share) {
      throw new ForbiddenException('No access to this dashboard');
    }

    const levels = { view: 0, edit: 1, admin: 2 };
    if (levels[share.permission] < levels[requiredLevel]) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }
}
```

### DTOs

```typescript
// src/modules/dashboards/dto/create-dashboard.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsBoolean, IsObject, MaxLength } from 'class-validator';

export class CreateDashboardDto {
  @ApiProperty({ description: 'Dashboard name', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Dashboard description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Associated project ID' })
  @IsUUID()
  @IsOptional()
  idProject?: string;

  @ApiPropertyOptional({ description: 'Dashboard settings' })
  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Layout configuration' })
  @IsObject()
  @IsOptional()
  layout?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Is this a template?' })
  @IsBoolean()
  @IsOptional()
  isTemplate?: boolean;
}
```

```typescript
// src/modules/dashboards/dto/dashboard-query.dto.ts

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, IsBoolean, IsNumber, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export class DashboardQueryDto {
  @ApiPropertyOptional({ description: 'Search by name/description' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by project' })
  @IsUUID()
  @IsOptional()
  idProject?: string;

  @ApiPropertyOptional({ description: 'Filter templates only' })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  isTemplate?: boolean;

  @ApiPropertyOptional({ description: 'Sort by field' })
  @IsString()
  @IsOptional()
  @IsIn(['name', 'created_at', 'updated_at'])
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsString()
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';

  @ApiPropertyOptional({ description: 'Skip (offset)' })
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  skip?: number;

  @ApiPropertyOptional({ description: 'Take (limit)' })
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  take?: number;
}
```

---

## 5.4 Widgets Module

### Controller

```typescript
// src/modules/widgets/widgets.controller.ts

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WidgetsService } from './widgets.service';
import { CreateWidgetDto } from './dto/create-widget.dto';
import { UpdateWidgetDto } from './dto/update-widget.dto';
import { BulkUpdatePositionsDto } from './dto/bulk-update-positions.dto';

@ApiTags('Widgets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboards/:dashboardId/widgets')
export class WidgetsController {
  constructor(private readonly widgetsService: WidgetsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all widgets for dashboard' })
  findAll(@Param('dashboardId') dashboardId: string, @Request() req) {
    return this.widgetsService.findAll(dashboardId, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get widget by ID' })
  findOne(
    @Param('dashboardId') dashboardId: string,
    @Param('id') id: string,
    @Request() req,
  ) {
    return this.widgetsService.findOne(dashboardId, id, req.user);
  }

  @Post()
  @ApiOperation({ summary: 'Create new widget' })
  create(
    @Param('dashboardId') dashboardId: string,
    @Body() dto: CreateWidgetDto,
    @Request() req,
  ) {
    return this.widgetsService.create(dashboardId, dto, req.user);
  }

  @Put('bulk/positions')
  @ApiOperation({ summary: 'Bulk update widget positions' })
  bulkUpdatePositions(
    @Param('dashboardId') dashboardId: string,
    @Body() dto: BulkUpdatePositionsDto,
    @Request() req,
  ) {
    return this.widgetsService.bulkUpdatePositions(dashboardId, dto, req.user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update widget' })
  update(
    @Param('dashboardId') dashboardId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWidgetDto,
    @Request() req,
  ) {
    return this.widgetsService.update(dashboardId, id, dto, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete widget' })
  remove(
    @Param('dashboardId') dashboardId: string,
    @Param('id') id: string,
    @Request() req,
  ) {
    return this.widgetsService.remove(dashboardId, id, req.user);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate widget' })
  duplicate(
    @Param('dashboardId') dashboardId: string,
    @Param('id') id: string,
    @Request() req,
  ) {
    return this.widgetsService.duplicate(dashboardId, id, req.user);
  }
}
```

### DTOs

```typescript
// src/modules/widgets/dto/create-widget.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsObject,
  IsNumber,
  IsIn,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

class GridPositionDto {
  @ApiProperty({ description: 'X position (column)' })
  @IsNumber()
  @Min(0)
  x: number;

  @ApiProperty({ description: 'Y position (row)' })
  @IsNumber()
  @Min(0)
  y: number;
}

class GridSizeDto {
  @ApiProperty({ description: 'Width in columns' })
  @IsNumber()
  @Min(1)
  @Max(12)
  w: number;

  @ApiProperty({ description: 'Height in rows' })
  @IsNumber()
  @Min(1)
  @Max(20)
  h: number;

  @ApiPropertyOptional({ description: 'Minimum width' })
  @IsNumber()
  @IsOptional()
  minW?: number;

  @ApiPropertyOptional({ description: 'Minimum height' })
  @IsNumber()
  @IsOptional()
  minH?: number;
}

export class CreateWidgetDto {
  @ApiProperty({
    description: 'Widget type',
    enum: ['line-chart', 'bar-chart', 'pie-chart', 'gauge', 'single-value', 'table', 'status-indicator', 'map'],
  })
  @IsString()
  @IsIn(['line-chart', 'bar-chart', 'pie-chart', 'gauge', 'single-value', 'table', 'status-indicator', 'map'])
  widgetType: string;

  @ApiPropertyOptional({ description: 'Widget title' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ description: 'Grid position' })
  @ValidateNested()
  @Type(() => GridPositionDto)
  gridPosition: GridPositionDto;

  @ApiProperty({ description: 'Grid size' })
  @ValidateNested()
  @Type(() => GridSizeDto)
  gridSize: GridSizeDto;

  @ApiProperty({ description: 'Data source configuration' })
  @IsObject()
  dataSource: Record<string, any>;

  @ApiPropertyOptional({ description: 'Widget configuration' })
  @IsObject()
  @IsOptional()
  config?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Refresh interval in seconds' })
  @IsNumber()
  @IsOptional()
  @Min(5)
  @Max(3600)
  refreshIntervalSec?: number;
}
```

```typescript
// src/modules/widgets/dto/bulk-update-positions.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsUUID, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

class WidgetPositionDto {
  @ApiProperty({ description: 'Widget ID' })
  @IsUUID()
  idWidget: string;

  @ApiProperty({ description: 'New X position' })
  @IsNumber()
  x: number;

  @ApiProperty({ description: 'New Y position' })
  @IsNumber()
  y: number;

  @ApiProperty({ description: 'New width' })
  @IsNumber()
  w: number;

  @ApiProperty({ description: 'New height' })
  @IsNumber()
  h: number;
}

export class BulkUpdatePositionsDto {
  @ApiProperty({ description: 'Array of widget positions', type: [WidgetPositionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WidgetPositionDto)
  positions: WidgetPositionDto[];
}
```

---

## 5.5 Widget Data Module

### Controller

```typescript
// src/modules/widget-data/widget-data.controller.ts

import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WidgetDataService } from './widget-data.service';
import { QueryDataDto } from './dto/query-data.dto';

@ApiTags('Widget Data')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('widget-data')
export class WidgetDataController {
  constructor(private readonly widgetDataService: WidgetDataService) {}

  @Get(':widgetId')
  @ApiOperation({ summary: 'Get data for a specific widget' })
  getWidgetData(
    @Param('widgetId') widgetId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Request() req,
  ) {
    return this.widgetDataService.getWidgetData(widgetId, { from, to }, req.user);
  }

  @Post('query')
  @ApiOperation({ summary: 'Query data with custom parameters' })
  queryData(@Body() dto: QueryDataDto, @Request() req) {
    return this.widgetDataService.queryData(dto, req.user);
  }

  @Get('preview/:widgetType')
  @ApiOperation({ summary: 'Get sample data for widget preview' })
  getPreviewData(
    @Param('widgetType') widgetType: string,
    @Query() dataSource: Record<string, any>,
    @Request() req,
  ) {
    return this.widgetDataService.getPreviewData(widgetType, dataSource, req.user);
  }
}
```

### Service

```typescript
// src/modules/widget-data/widget-data.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Widget } from '../widgets/entities/widget.entity';
import { SensorDataProvider } from './providers/sensor-data.provider';
import { NodeStatusProvider } from './providers/node-status.provider';
import { AggregationProvider } from './providers/aggregation.provider';

@Injectable()
export class WidgetDataService {
  constructor(
    @InjectRepository(Widget)
    private widgetRepo: Repository<Widget>,
    private sensorDataProvider: SensorDataProvider,
    private nodeStatusProvider: NodeStatusProvider,
    private aggregationProvider: AggregationProvider,
  ) {}

  async getWidgetData(widgetId: string, timeRange: { from: string; to: string }, user: any) {
    const widget = await this.widgetRepo.findOne({
      where: { idWidget: widgetId },
      relations: ['dashboard'],
    });

    if (!widget) {
      throw new NotFoundException('Widget not found');
    }

    // Check access to dashboard
    // ... (access control logic)

    return this.fetchData(widget.dataSource, widget.widgetType, timeRange);
  }

  async queryData(dto: any, user: any) {
    // Validate user has access to the requested data sources
    // ... (access control logic)

    return this.fetchData(dto.dataSource, dto.widgetType, dto.timeRange);
  }

  async getPreviewData(widgetType: string, dataSource: any, user: any) {
    const timeRange = {
      from: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // Last hour
      to: new Date().toISOString(),
    };

    return this.fetchData(dataSource, widgetType, timeRange);
  }

  private async fetchData(
    dataSource: any,
    widgetType: string,
    timeRange: { from: string; to: string },
  ) {
    switch (dataSource.type) {
      case 'sensor':
        return this.sensorDataProvider.fetch(dataSource, widgetType, timeRange);

      case 'node':
        return this.nodeStatusProvider.fetch(dataSource, widgetType);

      case 'aggregate':
        return this.aggregationProvider.fetch(dataSource, widgetType, timeRange);

      case 'static':
        return { data: dataSource.staticValue };

      default:
        throw new Error(`Unknown data source type: ${dataSource.type}`);
    }
  }
}
```

### Sensor Data Provider

```typescript
// src/modules/widget-data/providers/sensor-data.provider.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
// Assuming there's a telemetry/payload entity
import { PayloadHistory } from '../../telemetry/entities/payload-history.entity';

@Injectable()
export class SensorDataProvider {
  constructor(
    @InjectRepository(PayloadHistory)
    private payloadRepo: Repository<PayloadHistory>,
  ) {}

  async fetch(
    dataSource: any,
    widgetType: string,
    timeRange: { from: string; to: string },
  ) {
    const { nodeId, sensorId, channelKey, aggregation, groupBy } = dataSource;

    // Build query based on widget type
    if (widgetType === 'line-chart' || widgetType === 'bar-chart') {
      return this.fetchTimeSeries(nodeId, sensorId, channelKey, timeRange, groupBy, aggregation);
    }

    if (widgetType === 'gauge' || widgetType === 'single-value') {
      return this.fetchLatestValue(nodeId, sensorId, channelKey, aggregation);
    }

    if (widgetType === 'table') {
      return this.fetchTableData(nodeId, sensorId, timeRange);
    }

    throw new Error(`Unsupported widget type for sensor data: ${widgetType}`);
  }

  private async fetchTimeSeries(
    nodeId: string,
    sensorId: string,
    channelKey: string,
    timeRange: { from: string; to: string },
    groupBy: string,
    aggregation: string,
  ) {
    // Query implementation depends on your telemetry table structure
    const interval = this.getInterval(groupBy);

    const query = `
      SELECT 
        date_trunc('${interval}', created_at) as timestamp,
        ${this.getAggregationSql(aggregation)}(
          (payload->>'${channelKey}')::numeric
        ) as value
      FROM payload_history
      WHERE id_node = $1
        AND id_sensor = $2
        AND created_at BETWEEN $3 AND $4
      GROUP BY date_trunc('${interval}', created_at)
      ORDER BY timestamp ASC
    `;

    // Execute raw query
    const results = await this.payloadRepo.query(query, [
      nodeId,
      sensorId,
      timeRange.from,
      timeRange.to,
    ]);

    return {
      dataType: 'timeseries',
      data: results.map((r: any) => ({
        timestamp: r.timestamp,
        value: parseFloat(r.value),
      })),
      meta: {
        nodeId,
        sensorId,
        channelKey,
        aggregation,
        groupBy,
      },
    };
  }

  private async fetchLatestValue(
    nodeId: string,
    sensorId: string,
    channelKey: string,
    aggregation: string,
  ) {
    if (aggregation === 'last') {
      const latest = await this.payloadRepo.findOne({
        where: { idNode: nodeId, idSensor: sensorId },
        order: { createdAt: 'DESC' },
      });

      return {
        dataType: 'single',
        data: {
          value: latest?.payload?.[channelKey] ?? null,
          timestamp: latest?.createdAt,
        },
      };
    }

    // For other aggregations, use last hour
    const query = `
      SELECT ${this.getAggregationSql(aggregation)}(
        (payload->>'${channelKey}')::numeric
      ) as value
      FROM payload_history
      WHERE id_node = $1
        AND id_sensor = $2
        AND created_at > NOW() - INTERVAL '1 hour'
    `;

    const [result] = await this.payloadRepo.query(query, [nodeId, sensorId]);

    return {
      dataType: 'single',
      data: {
        value: parseFloat(result?.value) ?? null,
        timestamp: new Date(),
      },
    };
  }

  private async fetchTableData(
    nodeId: string,
    sensorId: string,
    timeRange: { from: string; to: string },
  ) {
    const data = await this.payloadRepo.find({
      where: {
        idNode: nodeId,
        idSensor: sensorId,
        createdAt: Between(new Date(timeRange.from), new Date(timeRange.to)),
      },
      order: { createdAt: 'DESC' },
      take: 100,
    });

    return {
      dataType: 'table',
      data: data.map((row) => ({
        timestamp: row.createdAt,
        ...row.payload,
      })),
    };
  }

  private getInterval(groupBy: string): string {
    const map: Record<string, string> = {
      minute: 'minute',
      hour: 'hour',
      day: 'day',
      week: 'week',
      month: 'month',
    };
    return map[groupBy] || 'minute';
  }

  private getAggregationSql(aggregation: string): string {
    const map: Record<string, string> = {
      avg: 'AVG',
      min: 'MIN',
      max: 'MAX',
      sum: 'SUM',
      count: 'COUNT',
      last: 'MAX', // fallback
    };
    return map[aggregation] || 'AVG';
  }
}
```

---

## 5.6 File Summary

| File | Purpose | Priority |
|------|---------|----------|
| `dashboards.module.ts` | Module definition | Phase 1 |
| `dashboards.controller.ts` | REST endpoints | Phase 1 |
| `dashboards.service.ts` | Business logic | Phase 1 |
| `dashboard.entity.ts` | TypeORM entity | Phase 1 |
| `widgets.module.ts` | Module definition | Phase 1 |
| `widgets.controller.ts` | REST endpoints | Phase 1 |
| `widgets.service.ts` | Business logic | Phase 1 |
| `widget.entity.ts` | TypeORM entity | Phase 1 |
| `widget-data.module.ts` | Module definition | Phase 2 |
| `widget-data.controller.ts` | REST endpoints | Phase 2 |
| `widget-data.service.ts` | Data orchestration | Phase 2 |
| `sensor-data.provider.ts` | Sensor data queries | Phase 2 |
| `realtime.gateway.ts` | WebSocket gateway | Phase 4 |

---

## Navigation

⬅️ [Previous: Database Design](./04-DATABASE-DESIGN.md) | [Back to Index](./00-INDEX.md) | [Next: Frontend Architecture](./06-FRONTEND-ARCHITECTURE.md) ➡️
