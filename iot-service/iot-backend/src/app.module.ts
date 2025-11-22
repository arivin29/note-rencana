import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OwnersModule } from './modules/owners/owners.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { NodeModelsModule } from './modules/node-models/node-models.module';
import { SensorTypesModule } from './modules/sensor-types/sensor-types.module';
import { SensorCatalogsModule } from './modules/sensor-catalogs/sensor-catalogs.module';
import { NodeLocationsModule } from './modules/node-locations/node-locations.module';
import { NodesModule } from './modules/nodes/nodes.module';
import { SensorsModule } from './modules/sensors/sensors.module';
import { SensorChannelsModule } from './modules/sensor-channels/sensor-channels.module';
import { AlertRulesModule } from './modules/alert-rules/alert-rules.module';
import { AlertEventsModule } from './modules/alert-events/alert-events.module';
import { NodeAssignmentsModule } from './modules/node-assignments/node-assignments.module';
import { UserDashboardsModule } from './modules/user-dashboards/user-dashboards.module';
import { DashboardWidgetsModule } from './modules/dashboard-widgets/dashboard-widgets.module';
import { SensorLogsModule } from './modules/sensor-logs/sensor-logs.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { UnpairedDevicesModule } from './modules/unpaired-devices/unpaired-devices.module';
import { MqttModule } from './modules/mqtt/mqtt.module';
import { DeviceCommandsModule } from './modules/device-commands/device-commands.module';
import * as entities from './entities'; 

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        const dbPort = Number(configService.get<string>('DB_PORT')) || 5432;
        const sslEnabled = configService.get<string>('DB_SSL', 'false') === 'true';

        return {
          type: 'postgres' as const,
          ...(databaseUrl
            ? { url: databaseUrl }
            : {
                host: configService.get<string>('DB_HOST', 'localhost'),
                port: dbPort,
                username: configService.get<string>('DB_USERNAME', 'postgres'),
                password: configService.get<string>('DB_PASSWORD', 'postgres'),
                database: configService.get<string>('DB_NAME', 'iot'),
              }),
          ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
          entities: Object.values(entities),
          synchronize: false,
        };
      },
    }),
    OwnersModule,
    ProjectsModule,
    NodeModelsModule,
    SensorTypesModule,
    SensorCatalogsModule,
    NodeLocationsModule,
    NodesModule,
    SensorsModule,
    SensorChannelsModule,
    AlertRulesModule,
    AlertEventsModule,
    NodeAssignmentsModule,
    UserDashboardsModule,
    DashboardWidgetsModule,
    SensorLogsModule,
    DashboardModule,
    UnpairedDevicesModule,
    MqttModule,
    DeviceCommandsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
