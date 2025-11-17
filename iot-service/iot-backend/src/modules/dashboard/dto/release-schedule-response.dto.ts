import { ApiProperty } from '@nestjs/swagger';

class ReleaseInfo {
  @ApiProperty({ description: 'Release start time', example: '2025-11-15T09:00:00Z' })
  startTime: Date;

  @ApiProperty({ description: 'Release end time', example: '2025-11-15T11:00:00Z' })
  endTime: Date;

  @ApiProperty({ description: 'Timezone', example: 'Asia/Jakarta' })
  timezone: string;

  @ApiProperty({ description: 'Formatted time window', example: '09:00 — 11:00 WIB' })
  formattedWindow: string;

  @ApiProperty({ description: 'Release version', example: 'v2.3.2' })
  version: string;

  @ApiProperty({ description: 'Release type', enum: ['firmware', 'backend', 'maintenance'], example: 'firmware' })
  type: 'firmware' | 'backend' | 'maintenance';

  @ApiProperty({ description: 'Number of affected devices', example: 24 })
  affectedDevices: number;

  @ApiProperty({ description: 'Release description', example: 'Firmware batch update' })
  description: string;

  @ApiProperty({ description: 'Expected impact description', example: 'Nodes will restart, 2-3 min downtime per device' })
  impact: string;

  @ApiProperty({ description: 'Release status', enum: ['scheduled', 'in_progress', 'completed'], example: 'scheduled' })
  status: 'scheduled' | 'in_progress' | 'completed';
}

export class ReleaseScheduleResponseDto {
  @ApiProperty({ description: 'Next scheduled release', type: ReleaseInfo })
  nextRelease: ReleaseInfo;

  @ApiProperty({ description: 'Upcoming releases (next 3)', type: [ReleaseInfo], required: false })
  upcomingReleases?: ReleaseInfo[];
}
