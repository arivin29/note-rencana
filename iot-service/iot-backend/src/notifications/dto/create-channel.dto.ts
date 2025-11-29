import { IsString, IsEnum, IsOptional, IsObject, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelType } from '../entities/notification-channel.entity';

export class CreateChannelDto {
  @ApiProperty({
    description: 'Channel name',
    example: 'Email Notifications',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Channel type',
    enum: ChannelType,
    example: ChannelType.EMAIL,
  })
  @IsEnum(ChannelType)
  type: ChannelType;

  @ApiPropertyOptional({
    description: 'Channel description',
    example: 'Primary email notification channel',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Channel configuration (e.g., SMTP settings for email)',
    example: {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: 'notifications@example.com', pass: '***' },
    },
  })
  @IsOptional()
  @IsObject()
  config?: any;

  @ApiPropertyOptional({
    description: 'Is channel active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
