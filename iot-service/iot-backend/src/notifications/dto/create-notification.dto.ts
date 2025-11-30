import { IsString, IsEnum, IsUUID, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '../entities/notification.entity';

export class CreateNotificationDto {
  @ApiProperty({
    description: 'User ID to send notification to',
    example: '5e207832-1923-4e0d-8bea-20159c2a5805',
  })
  @IsUUID()
  idUser: string;

  @ApiProperty({
    description: 'Notification channel ID',
    example: '789b4bc0-a118-4e49-95b1-cb2feec548bb',
  })
  @IsUUID()
  idChannel: string;

  @ApiProperty({
    description: 'Notification type',
    enum: NotificationType,
    example: NotificationType.INFO,
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({
    description: 'Notification title',
    example: 'System Alert',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Notification message',
    example: 'Your sensor threshold has been exceeded',
  })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { sensorId: '123', value: 75.5 },
  })
  @IsOptional()
  @IsObject()
  metadata?: any;
}
