import { ApiProperty } from '@nestjs/swagger';
import { IndustryStatDto, SlaStatDto, TopOwnerDto } from './owner-statistics-response.dto';

export class OwnerWidgetsResponseDto {
  @ApiProperty({ description: 'Total number of owners' })
  totalOwners: number;

  @ApiProperty({ description: 'Number of active owners' })
  activeOwners: number;

  @ApiProperty({ type: [IndustryStatDto], description: 'Distribution by industry' })
  byIndustry: IndustryStatDto[];

  @ApiProperty({ type: [SlaStatDto], description: 'Distribution by SLA level' })
  bySlaLevel: SlaStatDto[];

  @ApiProperty({ type: [TopOwnerDto], description: 'Top 5 owners' })
  topOwners: TopOwnerDto[];
}
