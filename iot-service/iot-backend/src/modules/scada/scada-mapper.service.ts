import { Injectable } from '@nestjs/common';
import { ScadaDiagram } from '../../entities/scada-diagram.entity';
import { ScadaEdge } from '../../entities/scada-edge.entity';
import { ScadaNode } from '../../entities/scada-node.entity';
import { ScadaNodeBinding } from '../../entities/scada-node-binding.entity';
import {
  ScadaDiagramDetailResponseDto,
  ScadaDiagramListItemResponseDto,
  ScadaRuntimeBindingResponseDto,
} from './dto';

@Injectable()
export class ScadaMapperService {
  toListItem(
    diagram: ScadaDiagram,
    counts?: { nodeCount?: number; edgeCount?: number },
  ): ScadaDiagramListItemResponseDto {
    return {
      id: diagram.idScadaDiagram,
      ownerId: diagram.idOwner,
      projectId: diagram.idProject,
      name: diagram.name,
      description: diagram.description,
      status: diagram.status,
      updatedAt: diagram.updatedAt,
      nodeCount: counts?.nodeCount,
      edgeCount: counts?.edgeCount,
    };
  }

  toDiagramDetail(diagram: ScadaDiagram): ScadaDiagramDetailResponseDto {
    const nodes = [...(diagram.nodes || [])].sort((a, b) => a.zIndex - b.zIndex);
    const edges = [...(diagram.edges || [])];

    return {
      diagram: {
        id: diagram.idScadaDiagram,
        ownerId: diagram.idOwner,
        projectId: diagram.idProject,
        name: diagram.name,
        description: diagram.description,
        diagramCode: diagram.diagramCode,
        status: diagram.status,
        canvasConfig: diagram.canvasConfig || {},
        runtimeConfig: diagram.runtimeConfig || {},
        createdAt: diagram.createdAt,
        updatedAt: diagram.updatedAt,
      },
      nodes: nodes.map((node) => this.toNode(node)),
      edges: edges.map((edge) => this.toEdge(edge)),
    };
  }

  toRuntimeBinding(
    binding: ScadaNodeBinding,
    runtime: {
      sensorTypeId?: string | null;
      category?: string | null;
      unit?: string | null;
      precision?: number | null;
      timestamp?: Date | null;
      value?: number | null;
      rawValue?: number | null;
      qualityFlag?: string | null;
      status: string;
      connectivityState: string;
      freshnessState: string;
    },
  ): ScadaRuntimeBindingResponseDto {
    return {
      bindingId: binding.idScadaNodeBinding,
      nodeId: binding.idScadaNode,
      bindingKey: binding.bindingKey,
      sensorChannelId: binding.idSensorChannel,
      sensorTypeId: runtime.sensorTypeId ?? null,
      category: runtime.category ?? null,
      unit: runtime.unit ?? null,
      precision: runtime.precision ?? null,
      timestamp: runtime.timestamp ?? null,
      value: runtime.value ?? null,
      rawValue: runtime.rawValue ?? null,
      qualityFlag: runtime.qualityFlag ?? null,
      status: runtime.status,
      connectivityState: runtime.connectivityState,
      freshnessState: runtime.freshnessState,
      displayLabel: binding.displayLabel,
      unitOverride: binding.unitOverride,
    };
  }

  private toNode(node: ScadaNode) {
    return {
      id: node.idScadaNode,
      type: node.nodeType,
      label: node.label,
      position: {
        x: node.positionX,
        y: node.positionY,
      },
      size: {
        width: node.width,
        height: node.height,
      },
      rotationDeg: node.rotationDeg,
      zIndex: node.zIndex,
      relatedNodeId: node.idRelatedNode,
      relatedSensorId: node.idRelatedSensor,
      style: node.styleJson || {},
      config: node.configJson || {},
      bindings: [...(node.bindings || [])]
        .sort((a, b) => a.priorityOrder - b.priorityOrder)
        .map((binding) => this.toBinding(binding)),
    };
  }

  private toBinding(binding: ScadaNodeBinding) {
    return {
      id: binding.idScadaNodeBinding,
      bindingKey: binding.bindingKey,
      sensorChannelId: binding.idSensorChannel,
      displayLabel: binding.displayLabel,
      unitOverride: binding.unitOverride,
      transform: binding.transformJson,
      priorityOrder: binding.priorityOrder,
      isPrimary: binding.isPrimary,
      showTrend: binding.showTrend ?? false,
      trendHours: binding.trendHours ?? 1,
    };
  }

  private toEdge(edge: ScadaEdge) {
    return {
      id: edge.idScadaEdge,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      edgeType: edge.edgeType,
      label: edge.label,
      pipeType: edge.pipeType,
      flowDirection: edge.flowDirection,
      animated: edge.animated,
      style: edge.styleJson || {},
      config: edge.configJson || {},
    };
  }
}
