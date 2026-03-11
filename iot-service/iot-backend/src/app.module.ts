import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
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
import { NodeProfilesModule } from './modules/node-profiles/node-profiles.module';
import { MqttModule } from './modules/mqtt/mqtt.module';
import { DeviceCommandsModule } from './modules/device-commands/device-commands.module';
import { IotLogsModule } from './modules/iot-logs/iot-logs.module';
import { WidgetBuilderModule } from './modules/widget-builder/widget-builder.module';
import { WebgisModule } from './modules/webgis/webgis.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { UsersModule } from './users/users.module';
import { AuditModule } from './audit/audit.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ClickhouseModule } from './modules/clickhouse';
import { ExternalApiModule } from './modules/external-api/external-api.module';
import { MlModule } from './modules/ml/ml.module';
import { ReportModule } from './modules/report/report.module';
import { SearchModule } from './modules/search/search.module';
import clickhouseConfig from './config/clickhouse.config';
import * as entities from './entities'; 

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [clickhouseConfig],
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        const dbPort = Number(configService.get<string>('DB_PORT')) || 5432;
        const sslEnabled = configService.get<string>('DB_SSL', 'false') === 'true';

        const baseConfig: TypeOrmModuleOptions = {
          type: 'postgres',
          ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
          entities: Object.values(entities) as any[],
          synchronize: false,
        };

        if (databaseUrl) {
          return { ...baseConfig, url: databaseUrl } as TypeOrmModuleOptions;
        }

        return {
          ...baseConfig,
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: dbPort,
          username: configService.get<string>('DB_USERNAME', 'postgres'),
          password: configService.get<string>('DB_PASSWORD', 'postgres'),
          database: configService.get<string>('DB_NAME', 'iot'),
        } as TypeOrmModuleOptions;
      },
    }),
    AuthModule,
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
    NodeProfilesModule,
    MqttModule,
    DeviceCommandsModule,
    IotLogsModule,
    WidgetBuilderModule,
    WebgisModule,
    DocumentsModule,
    UsersModule,
    AuditModule,
    NotificationsModule,
    ClickhouseModule,
    ExternalApiModule,
    MlModule,
    ReportModule,
    SearchModule,
  ],
  controllers: [AppController],
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
