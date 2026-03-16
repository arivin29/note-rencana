import { ScadaDiagram } from '../../entities/scada-diagram.entity';
import { ScadaEdge } from '../../entities/scada-edge.entity';
import { ScadaNode } from '../../entities/scada-node.entity';
import { ScadaNodeBinding } from '../../entities/scada-node-binding.entity';
import { ScadaMapperService } from './scada-mapper.service';

describe('ScadaMapperService', () => {
  let service: ScadaMapperService;

  beforeEach(() => {
    service = new ScadaMapperService();
  });

  it('maps diagram graph into API detail payload', () => {
    const binding = {
      idScadaNodeBinding: 'binding-1',
      bindingKey: 'pressure',
      idSensorChannel: 'channel-1',
      displayLabel: 'Pressure',
      unitOverride: 'bar',
      transformJson: { multiply: 1 },
      priorityOrder: 1,
      isPrimary: true,
    } as ScadaNodeBinding;

    const node = {
      idScadaNode: 'node-1',
      nodeType: 'pump',
      label: 'Pump A',
      positionX: 10,
      positionY: 20,
      width: 120,
      height: 80,
      rotationDeg: 0,
      zIndex: 2,
      idRelatedNode: 'related-node-1',
      idRelatedSensor: null,
      styleJson: { fill: 'blue' },
      configJson: { mode: 'auto' },
      bindings: [binding],
    } as ScadaNode;

    const edge = {
      idScadaEdge: 'edge-1',
      sourceNodeId: 'node-1',
      targetNodeId: 'node-2',
      edgeType: 'pipe',
      label: 'Line 1',
      pipeType: 'treated',
      flowDirection: 'forward',
      animated: true,
      styleJson: { stroke: 'green' },
      configJson: { width: 4 },
    } as ScadaEdge;

    const diagram = {
      idScadaDiagram: 'diagram-1',
      idOwner: 'owner-1',
      idProject: 'project-1',
      name: 'Main Line',
      description: 'Diagram operasional',
      diagramCode: 'MAIN-LINE',
      status: 'active',
      canvasConfig: { zoom: 1 },
      runtimeConfig: { pollMs: 5000 },
      createdAt: new Date('2026-03-15T00:00:00.000Z'),
      updatedAt: new Date('2026-03-15T01:00:00.000Z'),
      nodes: [node],
      edges: [edge],
    } as ScadaDiagram;

    const result = service.toDiagramDetail(diagram);

    expect(result.diagram.id).toBe('diagram-1');
    expect(result.nodes[0].bindings[0]).toEqual({
      id: 'binding-1',
      bindingKey: 'pressure',
      sensorChannelId: 'channel-1',
      displayLabel: 'Pressure',
      unitOverride: 'bar',
      transform: { multiply: 1 },
      priorityOrder: 1,
      isPrimary: true,
    });
    expect(result.edges[0]).toMatchObject({
      id: 'edge-1',
      source: 'node-1',
      target: 'node-2',
      pipeType: 'treated',
      animated: true,
    });
  });
});
