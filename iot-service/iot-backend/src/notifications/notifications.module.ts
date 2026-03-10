import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { MlNotificationController } from './controllers/ml-notification.controller';
import { Notification } from './entities/notification.entity';
import { NotificationChannel } from './entities/notification-channel.entity';
import { User } from '../auth/entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { AnomalyResult } from '../entities/anomaly-result.entity';
import { SensorChannel } from '../entities/sensor-channel.entity';
import { EmailTemplateService } from './services/email-template.service';
import { AlertDeduplicationService } from './services/alert-deduplication.service';
import { MlNotificationService } from './services/ml-notification.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, NotificationChannel, User, AnomalyResult, SensorChannel]),
    AuthModule,
  ],
  controllers: [NotificationsController, MlNotificationController],
  providers: [
    NotificationsService,
    EmailTemplateService,
    AlertDeduplicationService,
    MlNotificationService,
  ],
  exports: [NotificationsService, MlNotificationService, EmailTemplateService],
})
export class NotificationsModule {}
