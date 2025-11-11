import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SensorTypesController } from './sensor-types.controller';
import { SensorTypesService } from './sensor-types.service';
import { SensorType } from '../../entities/sensor-type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SensorType])],
  controllers: [SensorTypesController],
  providers: [SensorTypesService],
  exports: [SensorTypesService],
})
export class SensorTypesModule {}
