import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import databaseConfig from './config/database.config';
import mqttConfig from './config/mqtt.config';
import deviceDefaultsConfig from './config/device-defaults.config';
import teltonikaConfig from './config/teltonika.config';
import clickhouseConfig from './config/clickhouse.config';
import opensearchConfig from './config/opensearch.config';
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
import { TeltonikaModule } from './modules/teltonika/teltonika.module';
import { ClickhouseModule } from './modules/clickhouse/clickhouse.module';
import { MlModule } from './modules/ml/ml.module';

@Module({
    imports: [
        // Config Module
        ConfigModule.forRoot({
            isGlobal: true,
            load: [databaseConfig, mqttConfig, deviceDefaultsConfig, clickhouseConfig, teltonikaConfig, opensearchConfig],
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
        ClickhouseModule, // ClickHouse for time-series telemetry
        SchedulerAppModule, // Auto-process telemetry every 30 seconds
        TeltonikaModule, // Teltonika FM125 TCP Gateway
        MlModule, // ML/AI Anomaly Detection & Forecasting
    ],
})
export class AppModule { }
