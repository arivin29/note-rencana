# 📋 10 - Security

> **Document:** Security & Authorization  
> **Version:** 1.0.0  
> **Last Updated:** January 25, 2026

---

## 10.1 Authentication

### JWT Authentication

Semua endpoint (kecuali public dashboards) memerlukan JWT Bearer token.

```typescript
// Request Header
Authorization: Bearer <jwt_token>

// JWT Payload Structure
{
  "sub": "user-uuid",
  "idUser": "user-uuid",
  "idOwner": "owner-uuid",
  "email": "user@example.com",
  "role": "owner",  // 'admin' | 'owner' | 'operator' | 'viewer'
  "iat": 1737802800,
  "exp": 1737889200
}
```

### WebSocket Authentication

```typescript
// Socket.IO handshake authentication
const socket = io('/dashboard', {
  auth: {
    token: 'jwt-token-here'
  }
});

// Server-side validation
@WebSocketGateway()
export class RealtimeGateway {
  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token;
    
    if (!token) {
      client.disconnect();
      return;
    }
    
    try {
      const user = await this.jwtService.verify(token);
      client.data.user = user;
    } catch (error) {
      client.disconnect();
    }
  }
}
```

---

## 10.2 Authorization Model

### Role-Based Access Control (RBAC)

| Role | Dashboard Access | Widget Access | Data Access |
|------|-----------------|---------------|-------------|
| **Admin** | All dashboards | All widgets | All data |
| **Owner** | Own + Shared | Own + Shared | Own tenant data |
| **Operator** | Own + Shared | Own + Shared | Own tenant data |
| **Viewer** | Shared (view only) | View only | Own tenant data |

### Permission Levels for Shared Dashboards

| Permission | View | Edit Widgets | Edit Settings | Delete | Share |
|------------|------|--------------|---------------|--------|-------|
| `view` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `edit` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `admin` | ✅ | ✅ | ✅ | ✅ | ✅ |

### Access Control Matrix

```typescript
// Dashboard Access Rules
interface DashboardAccessRules {
  // Owner of the dashboard
  isOwner: (dashboard, user) => dashboard.idOwner === user.idOwner;
  
  // System admin
  isAdmin: (user) => user.role === 'admin';
  
  // Has share access
  hasShare: (dashboard, user) => 
    dashboard.shares.some(s => s.sharedToOwnerId === user.idOwner);
  
  // Public dashboard
  isPublic: (dashboard) => dashboard.isPublic === true;
}

// Data Access Rules
interface DataAccessRules {
  // User can only access nodes belonging to their owner
  canAccessNode: (node, user) => 
    user.role === 'admin' || node.idOwner === user.idOwner;
  
  // User can only access sensors from accessible nodes
  canAccessSensor: (sensor, user) =>
    this.canAccessNode(sensor.node, user);
}
```

---

## 10.3 Authorization Guards

### Dashboard Access Guard

```typescript
// guards/dashboard-access.guard.ts

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DashboardsService } from '../modules/dashboards/dashboards.service';

@Injectable()
export class DashboardAccessGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private dashboardsService: DashboardsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const dashboardId = request.params.id || request.params.dashboardId;

    if (!dashboardId) {
      return true; // No dashboard ID in route, skip check
    }

    // Required permission level from decorator
    const requiredPermission = this.reflector.get<string>(
      'dashboardPermission',
      context.getHandler(),
    ) || 'view';

    const hasAccess = await this.dashboardsService.checkAccess(
      dashboardId,
      user,
      requiredPermission,
    );

    if (!hasAccess) {
      throw new ForbiddenException('Insufficient permissions for this dashboard');
    }

    return true;
  }
}

// Custom decorator for specifying required permission
export const RequireDashboardPermission = (permission: 'view' | 'edit' | 'admin') =>
  SetMetadata('dashboardPermission', permission);
```

### Usage in Controller

```typescript
// dashboards.controller.ts

@Controller('dashboards')
@UseGuards(JwtAuthGuard, DashboardAccessGuard)
export class DashboardsController {
  
  @Get(':id')
  @RequireDashboardPermission('view')
  findOne(@Param('id') id: string) {
    return this.dashboardsService.findOne(id);
  }

  @Put(':id')
  @RequireDashboardPermission('edit')
  update(@Param('id') id: string, @Body() dto: UpdateDashboardDto) {
    return this.dashboardsService.update(id, dto);
  }

  @Delete(':id')
  @RequireDashboardPermission('admin')
  remove(@Param('id') id: string) {
    return this.dashboardsService.remove(id);
  }
}
```

### Data Source Access Guard

```typescript
// guards/data-access.guard.ts

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { NodesService } from '../modules/nodes/nodes.service';

@Injectable()
export class DataAccessGuard implements CanActivate {
  constructor(private nodesService: NodesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const body = request.body;

    // Check data source access when creating/updating widgets
    if (body.dataSource) {
      const { nodeId, sources } = body.dataSource;

      // Check single source
      if (nodeId) {
        const canAccess = await this.canAccessNode(nodeId, user);
        if (!canAccess) {
          throw new ForbiddenException('No access to specified node');
        }
      }

      // Check multiple sources
      if (sources && Array.isArray(sources)) {
        for (const source of sources) {
          const canAccess = await this.canAccessNode(source.nodeId, user);
          if (!canAccess) {
            throw new ForbiddenException(`No access to node: ${source.nodeId}`);
          }
        }
      }
    }

    return true;
  }

  private async canAccessNode(nodeId: string, user: any): Promise<boolean> {
    if (user.role === 'admin') return true;

    const node = await this.nodesService.findOne(nodeId);
    return node && node.idOwner === user.idOwner;
  }
}
```

---

## 10.4 Input Validation

### DTO Validation

```typescript
// dto/create-dashboard.dto.ts

import { 
  IsString, 
  IsOptional, 
  IsUUID, 
  IsBoolean, 
  IsObject,
  MaxLength,
  MinLength,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class DashboardSettingsDto {
  @IsNumber()
  @Min(5)
  @Max(3600)
  @IsOptional()
  refreshInterval?: number;

  @IsString()
  @IsIn(['light', 'dark'])
  @IsOptional()
  theme?: string;
}

export class CreateDashboardDto {
  @ApiProperty({ description: 'Dashboard name', minLength: 3, maxLength: 100 })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Dashboard description', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: 'Associated project ID', required: false })
  @IsUUID()
  @IsOptional()
  idProject?: string;

  @ApiProperty({ description: 'Dashboard settings', required: false })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => DashboardSettingsDto)
  settings?: DashboardSettingsDto;
}
```

### Widget Data Source Validation

```typescript
// validators/data-source.validator.ts

import { 
  ValidatorConstraint, 
  ValidatorConstraintInterface, 
  ValidationArguments,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';

@ValidatorConstraint({ name: 'isValidDataSource', async: false })
export class DataSourceValidator implements ValidatorConstraintInterface {
  validate(dataSource: any, args: ValidationArguments): boolean {
    if (!dataSource || !dataSource.type) {
      return false;
    }

    switch (dataSource.type) {
      case 'sensor':
        return !!(dataSource.nodeId && dataSource.sensorId && dataSource.channelKey);
      
      case 'node':
        return !!dataSource.nodeId;
      
      case 'aggregate':
        return !!dataSource.aggregation;
      
      case 'static':
        return dataSource.staticValue !== undefined;
      
      default:
        return false;
    }
  }

  defaultMessage(args: ValidationArguments): string {
    return 'Invalid data source configuration';
  }
}

export function IsValidDataSource(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: DataSourceValidator,
    });
  };
}

// Usage in DTO
export class CreateWidgetDto {
  @IsValidDataSource({ message: 'Data source configuration is invalid' })
  dataSource: any;
}
```

---

## 10.5 Rate Limiting

### API Rate Limits

```typescript
// main.ts

import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,     // Time window in seconds
      limit: 100,  // Max requests per window
    }),
  ],
})
export class AppModule {}

// Custom rate limits per endpoint
@Controller('widget-data')
export class WidgetDataController {
  
  @Get(':widgetId')
  @Throttle(30, 60)  // 30 requests per 60 seconds
  getWidgetData(@Param('widgetId') widgetId: string) {
    // ...
  }

  @Post('query')
  @Throttle(10, 60)  // 10 requests per 60 seconds (more restrictive)
  queryData(@Body() dto: QueryDataDto) {
    // ...
  }
}
```

### WebSocket Rate Limiting

```typescript
// Rate limit for WebSocket messages
const clientMessageCounts = new Map<string, { count: number; resetAt: number }>();

function checkMessageRateLimit(clientId: string): boolean {
  const now = Date.now();
  const limit = clientMessageCounts.get(clientId);

  if (!limit || now > limit.resetAt) {
    clientMessageCounts.set(clientId, { count: 1, resetAt: now + 60000 });
    return true;
  }

  if (limit.count >= 100) {  // 100 messages per minute
    return false;
  }

  limit.count++;
  return true;
}

// In gateway
@SubscribeMessage('subscribe:dashboard')
handleSubscribe(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
  if (!checkMessageRateLimit(client.id)) {
    client.emit('error', { code: 'RATE_LIMIT', message: 'Too many requests' });
    return;
  }
  // ... handle subscription
}
```

---

## 10.6 Data Limits

### Configuration Limits

| Resource | Limit | Rationale |
|----------|-------|-----------|
| Dashboards per owner | 100 | Prevent abuse |
| Widgets per dashboard | 50 | Performance |
| Shares per dashboard | 50 | Manageable access |
| Data points per query | 10,000 | Memory/performance |
| Time range max | 30 days | Storage efficiency |
| Refresh interval min | 5 seconds | Server load |
| Widget title max length | 100 chars | UI constraints |
| Dashboard name max length | 100 chars | UI constraints |

### Implementation

```typescript
// constants/limits.ts

export const DASHBOARD_LIMITS = {
  MAX_DASHBOARDS_PER_OWNER: 100,
  MAX_WIDGETS_PER_DASHBOARD: 50,
  MAX_SHARES_PER_DASHBOARD: 50,
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
};

export const WIDGET_LIMITS = {
  MAX_TITLE_LENGTH: 100,
  MIN_REFRESH_INTERVAL: 5,
  MAX_REFRESH_INTERVAL: 3600,
  MIN_GRID_SIZE: { w: 1, h: 1 },
  MAX_GRID_SIZE: { w: 12, h: 20 },
};

export const QUERY_LIMITS = {
  MAX_DATA_POINTS: 10000,
  MAX_TIME_RANGE_DAYS: 30,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
};

// Validation in service
async create(dto: CreateDashboardDto, user: any) {
  // Check dashboard count limit
  const count = await this.dashboardRepo.count({
    where: { idOwner: user.idOwner },
  });

  if (count >= DASHBOARD_LIMITS.MAX_DASHBOARDS_PER_OWNER) {
    throw new BadRequestException(
      `Maximum dashboards limit (${DASHBOARD_LIMITS.MAX_DASHBOARDS_PER_OWNER}) reached`
    );
  }

  // ... create dashboard
}
```

---

## 10.7 SQL Injection Prevention

### Using TypeORM Safely

```typescript
// ❌ UNSAFE - Don't do this
const results = await this.repo.query(
  `SELECT * FROM dashboards WHERE name = '${userInput}'`
);

// ✅ SAFE - Parameterized queries
const results = await this.repo.query(
  `SELECT * FROM dashboards WHERE name = $1`,
  [userInput]
);

// ✅ SAFE - TypeORM QueryBuilder
const results = await this.repo
  .createQueryBuilder('dashboard')
  .where('dashboard.name = :name', { name: userInput })
  .getMany();

// ✅ SAFE - TypeORM find methods
const results = await this.repo.find({
  where: { name: userInput },
});
```

### JSONB Query Safety

```typescript
// When querying JSONB fields
// ❌ UNSAFE
const query = `SELECT * FROM widgets WHERE data_source->>'nodeId' = '${nodeId}'`;

// ✅ SAFE - Use parameters
const query = `SELECT * FROM widgets WHERE data_source->>'nodeId' = $1`;
const results = await this.repo.query(query, [nodeId]);

// ✅ SAFE - TypeORM with JSON operators
const results = await this.repo
  .createQueryBuilder('widget')
  .where(`widget.data_source->>'nodeId' = :nodeId`, { nodeId })
  .getMany();
```

---

## 10.8 XSS Prevention

### Frontend Sanitization

```typescript
// Angular automatically escapes HTML in templates
// {{ userInput }} is safe by default

// When using innerHTML, sanitize first
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({ ... })
export class WidgetComponent {
  safeHtml: SafeHtml;

  constructor(private sanitizer: DomSanitizer) {}

  setContent(html: string) {
    // Only allow safe HTML
    this.safeHtml = this.sanitizer.sanitize(SecurityContext.HTML, html);
  }
}
```

### Backend Sanitization

```typescript
// Sanitize user input before storing
import * as sanitizeHtml from 'sanitize-html';

export class CreateDashboardDto {
  @Transform(({ value }) => sanitizeHtml(value, {
    allowedTags: [], // No HTML allowed
    allowedAttributes: {},
  }))
  @IsString()
  name: string;

  @Transform(({ value }) => value ? sanitizeHtml(value, {
    allowedTags: ['b', 'i', 'em', 'strong'], // Limited HTML
    allowedAttributes: {},
  }) : value)
  @IsString()
  @IsOptional()
  description?: string;
}
```

---

## 10.9 CORS Configuration

```typescript
// main.ts

app.enableCors({
  origin: [
    'http://localhost:4200',         // Dev
    'https://dashboard.example.com', // Production
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400, // 24 hours
});

// WebSocket CORS
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    credentials: true,
  },
})
export class RealtimeGateway {}
```

---

## 10.10 Security Checklist

### Before Production

- [ ] JWT secret is strong and stored securely (env variable)
- [ ] HTTPS enforced for all endpoints
- [ ] WebSocket uses WSS in production
- [ ] Rate limiting configured
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention verified
- [ ] XSS prevention in place
- [ ] CORS properly configured
- [ ] Error messages don't leak sensitive info
- [ ] Audit logging enabled
- [ ] Dependencies updated (no known vulnerabilities)
- [ ] Database credentials secured
- [ ] API keys rotated regularly

### Monitoring

- [ ] Failed authentication attempts logged
- [ ] Rate limit violations logged
- [ ] Suspicious activity alerts configured
- [ ] Regular security audits scheduled

---

## Navigation

⬅️ [Previous: Real-time Architecture](./09-REALTIME-ARCHITECTURE.md) | [Back to Index](./00-INDEX.md) | [Next: Implementation Phases](./11-IMPLEMENTATION-PHASES.md) ➡️
