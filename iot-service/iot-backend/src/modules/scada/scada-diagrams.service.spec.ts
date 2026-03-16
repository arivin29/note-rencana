import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ScadaDiagram } from '../../entities/scada-diagram.entity';
import { ScadaEdge } from '../../entities/scada-edge.entity';
import { ScadaNode } from '../../entities/scada-node.entity';
import { ScadaNodeBinding } from '../../entities/scada-node-binding.entity';
import { SensorChannel } from '../../entities/sensor-channel.entity';
import { ScadaAccessService } from './scada-access.service';
import { ScadaDiagramsService } from './scada-diagrams.service';
import { ScadaMapperService } from './scada-mapper.service';

describe('ScadaDiagramsService', () => {
  let service: ScadaDiagramsService;
  let diagramRepository: jest.Mocked<Repository<ScadaDiagram>>;
  let nodeRepository: jest.Mocked<Repository<ScadaNode>>;
  let edgeRepository: jest.Mocked<Repository<ScadaEdge>>;
  let bindingRepository: jest.Mocked<Repository<ScadaNodeBinding>>;
  let sensorChannelRepository: jest.Mocked<Repository<SensorChannel>>;
  let accessService: jest.Mocked<ScadaAccessService>;
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    const diagramRepoMock = {
      createQueryBuilder: jest.fn(),
      create: jest.fn((payload) => payload),
      save: jest.fn(),
      findOne: jest.fn(),
    };
    const nodeRepoMock = {
      create: jest.fn((payload) => payload),
      save: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
    };
    const edgeRepoMock = {
      create: jest.fn((payload) => payload),
      save: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
    };
    const bindingRepoMock = {
      create: jest.fn((payload) => payload),
      save: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
    };
    const sensorChannelRepoMock = {
      count: jest.fn(),
    };
    const dataSourceMock = {
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScadaDiagramsService,
        ScadaMapperService,
        {
          provide: getRepositoryToken(ScadaDiagram),
          useValue: diagramRepoMock,
        },
        {
          provide: getRepositoryToken(ScadaNode),
          useValue: nodeRepoMock,
        },
        {
          provide: getRepositoryToken(ScadaEdge),
          useValue: edgeRepoMock,
        },
        {
          provide: getRepositoryToken(ScadaNodeBinding),
          useValue: bindingRepoMock,
        },
        {
          provide: getRepositoryToken(SensorChannel),
          useValue: sensorChannelRepoMock,
        },
        {
          provide: DataSource,
          useValue: dataSourceMock,
        },
        {
          provide: ScadaAccessService,
          useValue: {
            resolveOwnerScope: jest.fn(),
            assertProjectAccess: jest.fn(),
            assertDiagramAccess: jest.fn(),
            getDiagramOrFail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ScadaDiagramsService>(ScadaDiagramsService);
    diagramRepository = module.get(getRepositoryToken(ScadaDiagram));
    nodeRepository = module.get(getRepositoryToken(ScadaNode));
    edgeRepository = module.get(getRepositoryToken(ScadaEdge));
    bindingRepository = module.get(getRepositoryToken(ScadaNodeBinding));
    sensorChannelRepository = module.get(getRepositoryToken(SensorChannel));
    accessService = module.get(ScadaAccessService);
    dataSource = module.get(DataSource);
  });

  it('creates a new diagram and returns mapped detail payload', async () => {
    accessService.resolveOwnerScope.mockReturnValue('owner-1');
    diagramRepository.findOne.mockImplementation(async (options: any) => {
      if (options?.where?.diagramCode) {
        return null;
      }

      if (options?.where?.idScadaDiagram === 'diagram-1') {
        return {
          idScadaDiagram: 'diagram-1',
          idOwner: 'owner-1',
          idProject: 'project-1',
          name: 'Main Line',
          description: 'Diagram operasional',
          diagramCode: null,
          status: 'draft',
          canvasConfig: {},
          runtimeConfig: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          nodes: [],
          edges: [],
        } as ScadaDiagram;
      }

      return null;
    });
    diagramRepository.save.mockResolvedValue({
      idScadaDiagram: 'diagram-1',
    } as ScadaDiagram);

    const result = await service.create(
      {
        name: 'Main Line',
        projectId: 'project-1',
      },
      {
        idUser: 'user-1',
        idOwner: 'owner-1',
        role: 'tenant',
      },
    );

    expect(accessService.resolveOwnerScope).toHaveBeenCalledWith(undefined, expect.any(Object));
    expect(diagramRepository.save).toHaveBeenCalled();
    expect(result.diagram.name).toBe('Main Line');
  });

  it('rejects create when diagramCode is already used by the same owner', async () => {
    accessService.resolveOwnerScope.mockReturnValue('owner-1');
    diagramRepository.findOne.mockResolvedValueOnce({
      idScadaDiagram: 'diagram-existing',
      idOwner: 'owner-1',
      diagramCode: 'MAIN-LINE',
    } as ScadaDiagram);

    await expect(
      service.create(
        {
          name: 'Main Line',
          diagramCode: 'MAIN-LINE',
        },
        {
          idUser: 'user-1',
          idOwner: 'owner-1',
          role: 'tenant',
        },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('archives an existing diagram', async () => {
    const diagram = {
      idScadaDiagram: 'diagram-1',
      idOwner: 'owner-1',
      status: 'active',
      isActive: true,
    } as ScadaDiagram;

    accessService.getDiagramOrFail.mockResolvedValue(diagram);
    diagramRepository.save.mockResolvedValue({
      ...diagram,
      status: 'archived',
      isActive: false,
    });

    const result = await service.archive('diagram-1', {
      idUser: 'user-1',
      idOwner: 'owner-1',
      role: 'tenant',
    });

    expect(diagram.status).toBe('archived');
    expect(diagram.isActive).toBe(false);
    expect(result).toEqual({ message: 'Diagram archived successfully' });
  });

  it('updates a diagram with transactional full-save sync', async () => {
    const existingDiagram = {
      idScadaDiagram: 'diagram-1',
      idOwner: 'owner-1',
      idProject: 'project-1',
      name: 'Old Name',
      description: 'Old Desc',
      diagramCode: 'OLD',
      status: 'draft',
      canvasConfig: {},
      runtimeConfig: {},
      nodes: [
        {
          idScadaNode: 'node-existing',
          idScadaDiagram: 'diagram-1',
          nodeType: 'pump',
          label: 'Old Pump',
          positionX: 0,
          positionY: 0,
          width: 100,
          height: 80,
          zIndex: 0,
          bindings: [],
        },
        {
          idScadaNode: 'node-removed',
          idScadaDiagram: 'diagram-1',
          nodeType: 'valve',
          label: 'Removed Valve',
          positionX: 10,
          positionY: 10,
          width: 100,
          height: 80,
          zIndex: 0,
          bindings: [],
        },
      ],
      edges: [
        {
          idScadaEdge: 'edge-existing',
          idScadaDiagram: 'diagram-1',
          sourceNodeId: 'node-existing',
          targetNodeId: 'node-removed',
          edgeType: 'pipe',
        },
      ],
    } as unknown as ScadaDiagram;

    const finalDiagram = {
      idScadaDiagram: 'diagram-1',
      idOwner: 'owner-1',
      idProject: 'project-1',
      name: 'New Name',
      description: 'New Desc',
      diagramCode: 'NEW',
      status: 'active',
      canvasConfig: { zoom: 1.2 },
      runtimeConfig: { pollMs: 3000 },
      createdAt: new Date(),
      updatedAt: new Date(),
      nodes: [
        {
          idScadaNode: 'node-existing',
          nodeType: 'pump',
          label: 'Pump A',
          positionX: 100,
          positionY: 100,
          width: 120,
          height: 80,
          rotationDeg: 0,
          zIndex: 1,
          idRelatedNode: null,
          idRelatedSensor: null,
          styleJson: {},
          configJson: {},
          bindings: [
            {
              idScadaNodeBinding: 'binding-existing',
              bindingKey: 'pressure',
              idSensorChannel: 'channel-1',
              displayLabel: 'Pressure',
              unitOverride: 'bar',
              transformJson: null,
              priorityOrder: 1,
              isPrimary: true,
            },
          ],
        },
        {
          idScadaNode: 'node-new',
          nodeType: 'tank',
          label: 'Tank B',
          positionX: 200,
          positionY: 200,
          width: 140,
          height: 90,
          rotationDeg: 0,
          zIndex: 2,
          idRelatedNode: null,
          idRelatedSensor: null,
          styleJson: {},
          configJson: {},
          bindings: [],
        },
      ],
      edges: [
        {
          idScadaEdge: 'edge-new',
          sourceNodeId: 'node-existing',
          targetNodeId: 'node-new',
          edgeType: 'pipe',
          label: 'Line A',
          pipeType: 'treated',
          flowDirection: 'forward',
          animated: true,
          styleJson: {},
          configJson: {},
        },
      ],
    } as unknown as ScadaDiagram;

    let diagramLoadCount = 0;
    diagramRepository.findOne.mockImplementation(async (options: any) => {
      if (options?.where?.diagramCode === 'NEW') {
        return null;
      }

      if (options?.where?.idScadaDiagram === 'diagram-1' && options?.relations) {
        diagramLoadCount += 1;
        if (diagramLoadCount === 1) {
          return existingDiagram;
        }

        return finalDiagram;
      }

      return null;
    });
    sensorChannelRepository.count.mockResolvedValue(1);

    bindingRepository.find.mockResolvedValue([
      {
        idScadaNodeBinding: 'binding-existing',
        idScadaNode: 'node-existing',
        bindingKey: 'pressure',
        idSensorChannel: 'channel-1',
      } as ScadaNodeBinding,
    ]);

    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === ScadaDiagram) return diagramRepository;
        if (entity === ScadaNode) return nodeRepository;
        if (entity === ScadaEdge) return edgeRepository;
        if (entity === ScadaNodeBinding) return bindingRepository;
        throw new Error('Unexpected repository token');
      }),
    };

    dataSource.transaction.mockImplementation(async (callback: any) => callback(manager));

    nodeRepository.save.mockImplementation(async (payload: any) => ({
      ...payload,
      idScadaNode: payload.idScadaNode ?? 'node-new',
    }));
    edgeRepository.find.mockResolvedValue(existingDiagram.edges as any);
    edgeRepository.save.mockImplementation(async (payload: any) => ({
      ...payload,
      idScadaEdge: payload.idScadaEdge ?? 'edge-new',
    }));
    bindingRepository.save.mockImplementation(async (payload: any) => ({
      ...payload,
      idScadaNodeBinding: payload.idScadaNodeBinding ?? 'binding-existing',
    }));

    const result = await service.update(
      'diagram-1',
      {
        diagram: {
          name: 'New Name',
          description: 'New Desc',
          projectId: 'project-1',
          diagramCode: 'NEW',
          status: 'active',
          canvasConfig: { zoom: 1.2 },
          runtimeConfig: { pollMs: 3000 },
        },
        nodes: [
          {
            id: 'node-existing',
            type: 'pump',
            label: 'Pump A',
            position: { x: 100, y: 100 },
            size: { width: 120, height: 80 },
            rotationDeg: 0,
            zIndex: 1,
            style: {},
            config: {},
            bindings: [
              {
                id: 'binding-existing',
                bindingKey: 'pressure',
                sensorChannelId: 'channel-1',
                displayLabel: 'Pressure',
                unitOverride: 'bar',
                priorityOrder: 1,
                isPrimary: true,
              },
            ],
          },
          {
            id: 'node-new',
            type: 'tank',
            label: 'Tank B',
            position: { x: 200, y: 200 },
            size: { width: 140, height: 90 },
            rotationDeg: 0,
            zIndex: 2,
            style: {},
            config: {},
            bindings: [],
          },
        ],
        edges: [
          {
            id: 'edge-new',
            source: 'node-existing',
            target: 'node-new',
            edgeType: 'pipe',
            label: 'Line A',
            pipeType: 'treated',
            flowDirection: 'forward',
            animated: true,
            style: {},
            config: {},
          },
        ],
      },
      {
        idUser: 'user-1',
        idOwner: 'owner-1',
        role: 'tenant',
      },
    );

    expect(dataSource.transaction).toHaveBeenCalled();
    expect(diagramRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        idScadaDiagram: 'diagram-1',
        name: 'New Name',
        status: 'active',
      }),
    );
    expect(nodeRepository.save).toHaveBeenCalledTimes(2);
    expect(nodeRepository.delete).toHaveBeenCalledWith({ idScadaNode: expect.anything() });
    expect(edgeRepository.delete).toHaveBeenCalled();
    expect(edgeRepository.save).toHaveBeenCalled();
    expect(bindingRepository.save).toHaveBeenCalled();
    expect(result.diagram.name).toBe('New Name');
  });

  it('rejects update payload when node ids are missing', async () => {
    diagramRepository.findOne.mockResolvedValue({
      idScadaDiagram: 'diagram-1',
      idOwner: 'owner-1',
      nodes: [],
      edges: [],
    } as unknown as ScadaDiagram);

    await expect(
      service.update(
        'diagram-1',
        {
          diagram: {
            name: 'Invalid Diagram',
            status: 'draft',
            canvasConfig: {},
            runtimeConfig: {},
          },
          nodes: [
            {
              type: 'pump',
              label: 'Pump A',
              position: { x: 0, y: 0 },
              size: { width: 100, height: 80 },
              bindings: [],
            },
          ],
          edges: [],
        } as any,
        {
          idUser: 'user-1',
          idOwner: 'owner-1',
          role: 'tenant',
        },
      ),
    ).rejects.toThrow(BadRequestException);

    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rejects update payload when an edge points to itself', async () => {
    diagramRepository.findOne.mockResolvedValue({
      idScadaDiagram: 'diagram-1',
      idOwner: 'owner-1',
      nodes: [],
      edges: [],
    } as unknown as ScadaDiagram);

    await expect(
      service.update(
        'diagram-1',
        {
          diagram: {
            name: 'Invalid Diagram',
            status: 'active',
            canvasConfig: {},
            runtimeConfig: {},
          },
          nodes: [
            {
              id: 'node-1',
              type: 'pump',
              label: 'Pump A',
              position: { x: 0, y: 0 },
              size: { width: 100, height: 80 },
              bindings: [],
            },
          ],
          edges: [
            {
              id: 'edge-1',
              source: 'node-1',
              target: 'node-1',
              edgeType: 'pipe',
            },
          ],
        } as any,
        {
          idUser: 'user-1',
          idOwner: 'owner-1',
          role: 'tenant',
        },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws not found when diagram detail is missing', async () => {
    diagramRepository.findOne.mockResolvedValue(null);

    await expect(
      service.findOne('diagram-missing', {
        idUser: 'user-1',
        idOwner: 'owner-1',
        role: 'tenant',
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
