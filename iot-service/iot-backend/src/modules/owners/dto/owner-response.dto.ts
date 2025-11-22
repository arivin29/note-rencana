import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OwnerResponseDto {
  @ApiProperty({ description: 'Owner unique identifier' })
  idOwner: string;

  @ApiProperty({ description: 'Owner unique 5-digit code', example: 'A1B2C' })
  ownerCode: string;

  @ApiProperty({ description: 'Owner name' })
  name: string;

  @ApiProperty({ description: 'Industry type' })
  industry: string;

  @ApiPropertyOptional({ description: 'Contact person' })
  contactPerson?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  email?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  phone?: string;

  @ApiPropertyOptional({ description: 'Physical address' })
  address?: string;

  @ApiPropertyOptional({ description: 'SLA level' })
  slaLevel?: string;

  @ApiPropertyOptional({ description: 'Forwarding settings' })
  forwardingSettings?: Record<string, any>;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt: Date;
}
