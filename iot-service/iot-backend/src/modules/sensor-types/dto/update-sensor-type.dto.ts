import { PartialType } from '@nestjs/swagger';
import { CreateSensorTypeDto } from './create-sensor-type.dto';

export class UpdateSensorTypeDto extends PartialType(CreateSensorTypeDto) {}
