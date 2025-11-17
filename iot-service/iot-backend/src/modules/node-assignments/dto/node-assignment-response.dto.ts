import { ApiProperty } from '@nestjs/swagger';

export class NodeAssignmentResponseDto {
  @ApiProperty()
  idNodeAssignment: string;

  @ApiProperty()
  idNode: string;

  @ApiProperty()
  idProject: string;

  @ApiProperty()
  idOwner: string;

  @ApiProperty({ required: false })
  idNodeLocation?: string;

  @ApiProperty()
  startAt: Date;

  @ApiProperty({ required: false })
  endAt?: Date;

  @ApiProperty({ required: false })
  reason?: string;

  @ApiProperty({ required: false })
  assignedBy?: string;

  @ApiProperty({ required: false })
  ticketRef?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false })
  node?: {
    idNode: string;
    code: string;
    serialNumber: string;
  };

  @ApiProperty({ required: false })
  project?: {
    idProject: string;
    name: string;
  };

  @ApiProperty({ required: false })
  owner?: {
    idOwner: string;
    name: string;
  };

  @ApiProperty({ required: false })
  nodeLocation?: {
    idNodeLocation: string;
    address: string;
  };
}
