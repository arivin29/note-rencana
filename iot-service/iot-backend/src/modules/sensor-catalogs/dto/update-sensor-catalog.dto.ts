import { PartialType } from '@nestjs/swagger';
import { CreateSensorCatalogDto } from './create-sensor-catalog.dto';

export class UpdateSensorCatalogDto extends PartialType(CreateSensorCatalogDto) {}
