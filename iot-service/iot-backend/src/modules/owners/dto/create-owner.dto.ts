import { IsString, IsOptional, IsNotEmpty, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOwnerDto {
  @ApiProperty({ description: 'Owner name', example: 'PDAM Aceh Besar' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Industry type', example: 'Water Management' })
  @IsString()
  @IsNotEmpty()
  industry: string;

  @ApiPropertyOptional({ description: 'Contact person name', example: 'John Doe' })
  @IsString()
  @IsOptional()
  contactPerson?: string;

  @ApiPropertyOptional({
    description: 'SLA level',
    example: 'Gold',
    enum: ['Bronze', 'Silver', 'Gold', 'Platinum'],
  })
  @IsString()
  @IsOptional()
  slaLevel?: string;

  @ApiPropertyOptional({
    description: 'Forwarding settings (JSONB)',
    example: {
      enableWebhook: true,
      enableDatabase: false,
      batchSize: 100,
    },
  })
  @IsObject()
  @IsOptional()
  forwardingSettings?: Record<string, any>;
}
