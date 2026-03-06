import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { TenantApiKey } from './entities/tenant-api-key.entity';
import { TenantApiLog } from './entities/tenant-api-log.entity';
import { User } from '../../auth/entities/user.entity';
import { Owner } from '../../entities/owner.entity';
import { Project } from '../../entities/project.entity';
import { Node } from '../../entities/node.entity';
import { Sensor } from '../../entities/sensor.entity';
import { SensorChannel } from '../../entities/sensor-channel.entity';
import { SensorLog } from '../../entities/sensor-log.entity';
import { AlertEvent } from '../../entities/alert-event.entity';

// Services
import { TenantApiKeysService } from './services/tenant-api-keys.service';
import { ExternalApiService } from './services/external-api.service';

// Controllers
import { TenantApiKeysController } from './controllers/tenant-api-keys.controller';
import {
  ExternalApiInfoController,
  ExternalApiProjectsController,
  ExternalApiNodesController,
  ExternalApiSensorsController,
  ExternalApiSensorDataController,
  ExternalApiAlertsController,
} from './controllers/external-api.controller';

// Guards
import { ApiKeyGuard } from './guards/api-key.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TenantApiKey,
      TenantApiLog,
      User,
      Owner,
      Project,
      Node,
      Sensor,
      SensorChannel,
      SensorLog,
      AlertEvent,
    ]),
  ],
  controllers: [
    // Internal API - API Key Management (JWT auth)
    TenantApiKeysController,
    // External API - Tenant Data Access (API Key auth)
    ExternalApiInfoController,
    ExternalApiProjectsController,
    ExternalApiNodesController,
    ExternalApiSensorsController,
    ExternalApiSensorDataController,
    ExternalApiAlertsController,
  ],
  providers: [
    TenantApiKeysService,
    ExternalApiService,
    ApiKeyGuard,
  ],
  exports: [
    TenantApiKeysService,
    ExternalApiService,
    ApiKeyGuard,
  ],
})
export class ExternalApiModule {}
