import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from '../../entities/project.entity';
import { ScadaDiagram } from '../../entities/scada-diagram.entity';
import { ScadaEdge } from '../../entities/scada-edge.entity';
import { ScadaNode } from '../../entities/scada-node.entity';
import { ScadaNodeBinding } from '../../entities/scada-node-binding.entity';
import { SensorChannel } from '../../entities/sensor-channel.entity';
import { SensorLog } from '../../entities/sensor-log.entity';
import { ScadaAccessService } from './scada-access.service';
import { ScadaBindingOptionsController } from './scada-binding-options.controller';
import { ScadaBindingOptionsService } from './scada-binding-options.service';
import { ScadaDiagramsController } from './scada-diagrams.controller';
import { ScadaDiagramsService } from './scada-diagrams.service';
import { ScadaMapperService } from './scada-mapper.service';
import { ScadaRuntimeController } from './scada-runtime.controller';
import { ScadaRuntimeService } from './scada-runtime.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      ScadaDiagram,
      ScadaNode,
      ScadaEdge,
      ScadaNodeBinding,
      SensorChannel,
      SensorLog,
    ]),
  ],
  controllers: [ScadaDiagramsController, ScadaRuntimeController, ScadaBindingOptionsController],
  providers: [
    ScadaAccessService,
    ScadaBindingOptionsService,
    ScadaMapperService,
    ScadaDiagramsService,
    ScadaRuntimeService,
  ],
  exports: [ScadaDiagramsService, ScadaRuntimeService],
})
export class ScadaModule {}
