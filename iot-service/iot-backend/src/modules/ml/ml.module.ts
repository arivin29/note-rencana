import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { AnomalyResult } from '../../entities/anomaly-result.entity';
import { ForecastResult } from '../../entities/forecast-result.entity';
import { SensorChannel } from '../../entities/sensor-channel.entity';

// Controllers
import { AnomaliesController } from './controllers/anomalies.controller';
import { ForecastsController } from './controllers/forecasts.controller';
import { MlDashboardController } from './controllers/ml-dashboard.controller';

// Services
import { AnomaliesService } from './services/anomalies.service';
import { ForecastsService } from './services/forecasts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AnomalyResult, ForecastResult, SensorChannel]),
  ],
  controllers: [
    AnomaliesController,
    ForecastsController,
    MlDashboardController,
  ],
  providers: [
    AnomaliesService,
    ForecastsService,
  ],
  exports: [
    AnomaliesService,
    ForecastsService,
  ],
})
export class MlModule {}
