import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import databaseConfig from './config/database.config';
import mqttConfig from './config/mqtt.config';
import { IotLog } from './entities';
import { 
  Node, 
  NodeModel, 
  NodeProfile, 
  NodeUnpairedDevice, 
  Owner, 
  Project, 
  Sensor,
  SensorCatalog,
  SensorChannel, 
  SensorLog,
  SensorType
} from './entities/existing';
import { IotLogModule } from './modules/iot-log/iot-log.module';
import { MqttModule } from './modules/mqtt/mqtt.module';
import { HealthModule } from './modules/health/health.module';
import { SchedulerAppModule } from './modules/scheduler/scheduler.module';

@Module({
  imports: [
    // Config Module
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, mqttConfig],
      envFilePath: '.env',
    }),

    // TypeORM Module
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('database.url'),
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        entities: [
          IotLog,
          Node,
          NodeModel,
          NodeProfile,
          NodeUnpairedDevice,
          Owner,
          Project,
          Sensor,
          SensorCatalog,
          SensorChannel,
          SensorLog,
          SensorType,
        ],
        synchronize: false, // Use migrations instead
        logging: configService.get('database.logging'),
        ssl: configService.get('database.ssl'),
      }),
    }),

    // Feature Modules
    IotLogModule,
    MqttModule,
    HealthModule,
    SchedulerAppModule, // Auto-process telemetry every 30 seconds
  ],
})
export class AppModule {}
