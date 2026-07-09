import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import databaseConfig from '../../config/database.config';
import clickhouseConfig from '../../config/clickhouse.config';
import {
  AnomalyResult,
  Node,
  NodeModel,
  NodeProfile,
  NodeUnpairedDevice,
  Owner,
  OwnerForwardingDatabase,
  OwnerForwardingLog,
  OwnerForwardingMqtt,
  OwnerForwardingMqttLog,
  Project,
  Sensor,
  SensorCatalog,
  SensorChannel,
  SensorLog,
  SensorType,
} from '../../entities/existing';
import { IotLog } from '../../entities';
import { BroadcastModule } from './broadcast.module';

/**
 * Root module untuk PROSES TERPISAH `iot-broadcast` (PM2 app kedua).
 * Setup infrastruktur sama dgn AppModule (Config + TypeORM) minus HTTP/ingestion.
 * Ref spec §3.1 (crash domain terpisah dari ingestion).
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, clickhouseConfig],
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
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
          AnomalyResult,
          IotLog,
          Node,
          NodeModel,
          NodeProfile,
          NodeUnpairedDevice,
          Owner,
          OwnerForwardingDatabase,
          OwnerForwardingLog,
          OwnerForwardingMqtt,
          OwnerForwardingMqttLog,
          Project,
          Sensor,
          SensorCatalog,
          SensorChannel,
          SensorLog,
          SensorType,
        ],
        synchronize: false,
        logging: configService.get('database.logging'),
        ssl: configService.get('database.ssl'),
      }),
    }),
    BroadcastModule,
  ],
})
export class BroadcastRootModule {}
