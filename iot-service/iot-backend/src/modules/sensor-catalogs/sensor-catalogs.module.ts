import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SensorCatalogsController } from './sensor-catalogs.controller';
import { SensorCatalogsService } from './sensor-catalogs.service';
import { SensorCatalog } from '../../entities/sensor-catalog.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SensorCatalog])],
  controllers: [SensorCatalogsController],
  providers: [SensorCatalogsService],
  exports: [SensorCatalogsService],
})
export class SensorCatalogsModule {}
