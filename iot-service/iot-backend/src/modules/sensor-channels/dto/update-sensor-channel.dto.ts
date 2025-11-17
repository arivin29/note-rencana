import { PartialType } from '@nestjs/swagger';
import { CreateSensorChannelDto } from './create-sensor-channel.dto';

export class UpdateSensorChannelDto extends PartialType(CreateSensorChannelDto) {}
