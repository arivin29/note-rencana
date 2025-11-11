# IoT Backend Restructuring Guide

## 📁 New Structure

```
src/
├── entities/                    # ✅ All TypeORM entities
│   ├── owner.entity.ts
│   ├── project.entity.ts
│   ├── node-location.entity.ts
│   ├── node-model.entity.ts
│   ├── node.entity.ts
│   ├── node-assignment.entity.ts
│   ├── sensor-type.entity.ts
│   ├── sensor-catalog.entity.ts
│   ├── sensor.entity.ts
│   ├── sensor-channel.entity.ts
│   ├── sensor-log.entity.ts
│   ├── alert-rule.entity.ts
│   ├── alert-event.entity.ts
│   ├── user-dashboard.entity.ts
│   ├── dashboard-widget.entity.ts
│   ├── owner-forwarding-webhook.entity.ts
│   ├── owner-forwarding-database.entity.ts
│   ├── owner-forwarding-log.entity.ts
│   └── index.ts                 # Export all entities
│
├── common/
│   └── dto/                     # ✅ Shared DTOs
│       ├── pagination.dto.ts
│       ├── response.dto.ts
│       └── index.ts
│
├── modules/                     # ✅ Feature modules
│   ├── owners/
│   │   ├── dto/
│   │   │   ├── create-owner.dto.ts
│   │   │   ├── update-owner.dto.ts
│   │   │   └── index.ts
│   │   ├── owners.controller.ts
│   │   ├── owners.service.ts
│   │   └── owners.module.ts
│   │
│   ├── projects/
│   │   ├── dto/
│   │   ├── projects.controller.ts
│   │   ├── projects.service.ts
│   │   └── projects.module.ts
│   │
│   ├── nodes/
│   │   ├── dto/
│   │   ├── nodes.controller.ts
│   │   ├── nodes.service.ts
│   │   └── nodes.module.ts
│   │
│   ├── sensors/
│   │   ├── dto/
│   │   ├── sensors.controller.ts
│   │   ├── sensors.service.ts
│   │   └── sensors.module.ts
│   │
│   ├── telemetry/
│   │   ├── dto/
│   │   ├── telemetry.controller.ts
│   │   ├── telemetry.service.ts
│   │   └── telemetry.module.ts
│   │
│   └── dashboards/
│       ├── dto/
│       ├── dashboards.controller.ts
│       ├── dashboards.service.ts
│       └── dashboards.module.ts
│
├── database/
│   ├── data-source.ts           # TypeORM DataSource config
│   ├── migrations/               # Database migrations
│   │   └── 1736823000000-InitialSchema.ts
│   └── seeds/                    # Database seeders
│       └── seed.ts
│
├── app.module.ts
└── main.ts
```

## 🔧 Steps to Restructure

### 1. Create All Entity Files

I've already created:
- ✅ `owner.entity.ts`
- ✅ `project.entity.ts`
- ✅ `node-location.entity.ts`

You need to create the remaining 15 entities. Here's the command to generate all empty files:

```bash
cd /Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-backend

# Create remaining entity files
touch src/entities/node-model.entity.ts
touch src/entities/node.entity.ts
touch src/entities/node-assignment.entity.ts
touch src/entities/sensor-type.entity.ts
touch src/entities/sensor-catalog.entity.ts
touch src/entities/sensor.entity.ts
touch src/entities/sensor-channel.entity.ts
touch src/entities/sensor-log.entity.ts
touch src/entities/alert-rule.entity.ts
touch src/entities/alert-event.entity.ts
touch src/entities/user-dashboard.entity.ts
touch src/entities/dashboard-widget.entity.ts
touch src/entities/owner-forwarding-webhook.entity.ts
touch src/entities/owner-forwarding-database.entity.ts
touch src/entities/owner-forwarding-log.entity.ts
touch src/entities/index.ts
```

### 2. Entity Template Example

Here's the template for each entity (example: `node-model.entity.ts`):

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Node } from './node.entity';

@Entity('node_models')
export class NodeModel {
  @PrimaryGeneratedColumn('uuid', { name: 'id_node_model' })
  idNodeModel: string;

  @Column({ type: 'text', unique: true, nullable: true, name: 'model_code' })
  modelCode: string;

  @Column({ type: 'text', nullable: false })
  vendor: string;

  @Column({ type: 'text', nullable: false, name: 'model_name' })
  modelName: string;

  @Column({ type: 'text', nullable: false })
  protocol: string;

  @Column({ type: 'text', nullable: true, name: 'communication_band' })
  communicationBand: string;

  @Column({ type: 'text', nullable: true, name: 'power_type' })
  powerType: string;

  @Column({ type: 'text', nullable: true, name: 'hardware_class' })
  hardwareClass: string;

  @Column({ type: 'text', nullable: true, name: 'hardware_revision' })
  hardwareRevision: string;

  @Column({ type: 'text', nullable: true })
  toolchain: string;

  @Column({ type: 'text', nullable: true, name: 'build_agent' })
  buildAgent: string;

  @Column({ type: 'text', nullable: true, name: 'firmware_repo' })
  firmwareRepo: string;

  @Column({ type: 'text', nullable: true, name: 'flash_protocol' })
  flashProtocol: string;

  @Column({ type: 'boolean', default: false, name: 'supports_codegen' })
  supportsCodegen: boolean;

  @Column({ type: 'text', nullable: true, name: 'default_firmware' })
  defaultFirmware: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => Node, (node) => node.nodeModel)
  nodes: Node[];
}
```

### 3. Create entities/index.ts

```typescript
export { Owner } from './owner.entity';
export { Project } from './project.entity';
export { NodeLocation } from './node-location.entity';
export { NodeModel } from './node-model.entity';
export { Node } from './node.entity';
export { NodeAssignment } from './node-assignment.entity';
export { SensorType } from './sensor-type.entity';
export { SensorCatalog } from './sensor-catalog.entity';
export { Sensor } from './sensor.entity';
export { SensorChannel } from './sensor-channel.entity';
export { SensorLog } from './sensor-log.entity';
export { AlertRule } from './alert-rule.entity';
export { AlertEvent } from './alert-event.entity';
export { UserDashboard } from './user-dashboard.entity';
export { DashboardWidget } from './dashboard-widget.entity';
export { OwnerForwardingWebhook } from './owner-forwarding-webhook.entity';
export { OwnerForwardingDatabase } from './owner-forwarding-database.entity';
export { OwnerForwardingLog } from './owner-forwarding-log.entity';
```

### 4. Update data-source.ts

```typescript
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';

config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  
  // NEW: Point to entities folder
  entities: [path.join(__dirname, '../entities/**/*.entity{.ts,.js}')],
  
  migrations: [path.join(__dirname, './migrations/*{.ts,.js}')],
  
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});
```

### 5. Create Module Structure

Example for Owners Module:

#### modules/owners/dto/create-owner.dto.ts
```typescript
import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateOwnerDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  industry?: string;

  @IsString()
  @IsOptional()
  contactPerson?: string;

  @IsString()
  @IsOptional()
  slaLevel?: string;

  @IsObject()
  @IsOptional()
  forwardingSettings?: any;
}
```

#### modules/owners/owners.service.ts
```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Owner } from '../../entities/owner.entity';
import { CreateOwnerDto } from './dto/create-owner.dto';
import { UpdateOwnerDto } from './dto/update-owner.dto';

@Injectable()
export class OwnersService {
  constructor(
    @InjectRepository(Owner)
    private ownersRepository: Repository<Owner>,
  ) {}

  async create(createOwnerDto: CreateOwnerDto): Promise<Owner> {
    const owner = this.ownersRepository.create(createOwnerDto);
    return await this.ownersRepository.save(owner);
  }

  async findAll(): Promise<Owner[]> {
    return await this.ownersRepository.find({
      relations: ['projects'],
    });
  }

  async findOne(id: string): Promise<Owner> {
    return await this.ownersRepository.findOne({
      where: { idOwner: id },
      relations: ['projects'],
    });
  }

  async update(id: string, updateOwnerDto: UpdateOwnerDto): Promise<Owner> {
    await this.ownersRepository.update(id, updateOwnerDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.ownersRepository.delete(id);
  }
}
```

#### modules/owners/owners.controller.ts
```typescript
import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { OwnersService } from './owners.service';
import { CreateOwnerDto } from './dto/create-owner.dto';
import { UpdateOwnerDto } from './dto/update-owner.dto';

@Controller('owners')
export class OwnersController {
  constructor(private readonly ownersService: OwnersService) {}

  @Post()
  create(@Body() createOwnerDto: CreateOwnerDto) {
    return this.ownersService.create(createOwnerDto);
  }

  @Get()
  findAll() {
    return this.ownersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ownersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOwnerDto: UpdateOwnerDto) {
    return this.ownersService.update(id, updateOwnerDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ownersService.remove(id);
  }
}
```

#### modules/owners/owners.module.ts
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OwnersService } from './owners.service';
import { OwnersController } from './owners.controller';
import { Owner } from '../../entities/owner.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Owner])],
  controllers: [OwnersController],
  providers: [OwnersService],
  exports: [OwnersService],
})
export class OwnersModule {}
```

### 6. Update app.module.ts

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppDataSource } from './database/data-source';

// Import all modules
import { OwnersModule } from './modules/owners/owners.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { NodesModule } from './modules/nodes/nodes.module';
import { SensorsModule } from './modules/sensors/sensors.module';
import { TelemetryModule } from './modules/telemetry/telemetry.module';
import { DashboardsModule } from './modules/dashboards/dashboards.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => AppDataSource.options,
    }),
    OwnersModule,
    ProjectsModule,
    NodesModule,
    SensorsModule,
    TelemetryModule,
    DashboardsModule,
  ],
})
export class AppModule {}
```

### 7. Update Seeds

The seed file needs to import entities from the new location:

```typescript
import { AppDataSource } from '../data-source';
import { Owner } from '../../entities/owner.entity';
import { Project } from '../../entities/project.entity';
// ... import other entities
```

## 🚀 Quick Start Commands

```bash
# 1. Install dependencies (if needed)
npm install class-validator class-transformer @nestjs/config

# 2. Generate module boilerplate (example for owners)
nest g module modules/owners
nest g service modules/owners
nest g controller modules/owners

# 3. Run migrations (already done)
npm run migration:run

# 4. Run seeds
npm run seed

# 5. Start development server
npm run start:dev
```

## 📝 Notes

1. All entities are in `src/entities/`
2. All DTOs specific to a module go in `modules/{module-name}/dto/`
3. Common DTOs (pagination, response, etc.) go in `src/common/dto/`
4. Each module has: controller, service, module file, and dto folder
5. Use camelCase for properties in entities (TypeORM will convert to snake_case)

## ✅ Checklist

- [ ] Create all 18 entity files
- [ ] Create entities/index.ts to export all
- [ ] Update data-source.ts to point to entities
- [ ] Create modules folder structure
- [ ] Create at least one module (owners) as example
- [ ] Update app.module.ts to import all modules
- [ ] Update seed file to use new entity paths
- [ ] Test API endpoints
- [ ] Generate Swagger/OpenAPI docs

Would you like me to generate any specific entity or module? Let me know which one to start with!
