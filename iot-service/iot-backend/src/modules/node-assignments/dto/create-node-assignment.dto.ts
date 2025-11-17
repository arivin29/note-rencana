import { IsUUID, IsString, IsOptional, IsNotEmpty, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNodeAssignmentDto {
  @ApiProperty({ description: 'Node ID' })
  @IsUUID()
  @IsNotEmpty()
  idNode: string;

  @ApiProperty({ description: 'Project ID' })
  @IsUUID()
  @IsNotEmpty()
  idProject: string;

  @ApiProperty({ description: 'Owner ID' })
  @IsUUID()
  @IsNotEmpty()
  idOwner: string;

  @ApiProperty({ description: 'Node location ID', required: false })
  @IsUUID()
  @IsOptional()
  idNodeLocation?: string;

  @ApiProperty({ description: 'Assignment start date' })
  @IsDateString()
  @IsNotEmpty()
  startAt: Date;

  @ApiProperty({ description: 'Assignment end date', required: false })
  @IsDateString()
  @IsOptional()
  endAt?: Date;

  @ApiProperty({ description: 'Reason for assignment', required: false })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiProperty({ description: 'User ID who assigned', required: false })
  @IsUUID()
  @IsOptional()
  assignedBy?: string;

  @ApiProperty({ description: 'Ticket reference', required: false })
  @IsString()
  @IsOptional()
  ticketRef?: string;
}
