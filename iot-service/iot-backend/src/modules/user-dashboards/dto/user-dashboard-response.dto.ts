import { ApiProperty } from '@nestjs/swagger';

export class UserDashboardResponseDto {
  @ApiProperty()
  idDashboard: string;

  @ApiProperty()
  idUser: string;

  @ApiProperty({ required: false })
  idProject?: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  layoutType: string;

  @ApiProperty()
  gridCols: number;

  @ApiProperty()
  isDefault: boolean;

  @ApiProperty()
  isPublic: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false })
  project?: {
    idProject: string;
    name: string;
  };
}

export class UserDashboardDetailedResponseDto extends UserDashboardResponseDto {
  @ApiProperty({ description: 'Dashboard widgets', type: 'array' })
  widgets: Array<{
    idWidgetInstance: string;
    widgetType: string;
    positionX: number;
    positionY: number;
    sizeWidth: number;
    sizeHeight: number;
    configJson: Record<string, any>;
    refreshRate: number;
    displayOrder: number;
  }>;

  @ApiProperty({ description: 'Statistics' })
  stats: {
    totalWidgets: number;
    widgetsByType: Record<string, number>;
  };
}
