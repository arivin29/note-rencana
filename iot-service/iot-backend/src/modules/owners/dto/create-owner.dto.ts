import { IsString, IsOptional, IsNotEmpty, IsObject, IsEmail } from 'class-validator';
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

  @ApiPropertyOptional({ description: 'Email address', example: 'contact@company.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Phone number', example: '+62812345678' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Physical address', example: 'Jl. Example No. 123, Jakarta' })
  @IsString()
  @IsOptional()
  address?: string;

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
