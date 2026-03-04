import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

// Services
import { OpenSearchService } from './services/opensearch.service';
import { SyncService } from './services/sync.service';
import { MlOrchestrationService } from './services/ml-orchestration.service';
import { ForecastService } from './services/forecast.service';
import { DetectorManagerService } from './services/detector-manager.service';
import { AnomalyNotifierService } from './services/anomaly-notifier.service';

// Controllers
import { DetectorController } from './controllers/detector.controller';
import { SyncController } from './controllers/sync.controller';

// Jobs
import { SyncJob } from './jobs/sync.job';
import { TestJob } from './jobs/test.job';
import { AnomalyPollJob } from './jobs/anomaly-poll.job';
import { ForecastJob } from './jobs/forecast.job';
import { CleanupJob } from './jobs/cleanup.job';

// Config
import opensearchConfig from '../../config/opensearch.config';

@Module({
  imports: [
    ConfigModule.forFeature(opensearchConfig),
    ScheduleModule.forRoot(),
  ],
  controllers: [
    DetectorController,
    SyncController,
  ],
  providers: [
    // Services
    OpenSearchService,
    SyncService,
    MlOrchestrationService,
    ForecastService,
    DetectorManagerService,
    AnomalyNotifierService,

    // Jobs
    SyncJob,
    TestJob,
    AnomalyPollJob,
    ForecastJob,
    CleanupJob,
  ],
  exports: [
    OpenSearchService,
    SyncService,
    MlOrchestrationService,
    ForecastService,
    DetectorManagerService,
    AnomalyNotifierService,
    TestJob,
  ],
})
export class MlModule {}
