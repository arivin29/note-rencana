import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SensorLog } from '../../entities/sensor-log.entity';
import { ScadaDiagram } from '../../entities/scada-diagram.entity';
import { ScadaNodeBinding } from '../../entities/scada-node-binding.entity';
import { ScadaAccessService } from './scada-access.service';
import { ScadaMapperService } from './scada-mapper.service';
import { ScadaRuntimeService } from './scada-runtime.service';

describe('ScadaRuntimeService', () => {
  let service: ScadaRuntimeService;
  let bindingRepository: jest.Mocked<Repository<ScadaNodeBinding>>;
  let sensorLogRepository: jest.Mocked<Repository<SensorLog>>;
  let accessService: jest.Mocked<ScadaAccessService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScadaRuntimeService,
        ScadaMapperService,
        {
          provide: getRepositoryToken(ScadaDiagram),
          useValue: {},
        },
        {
          provide: getRepositoryToken(ScadaNodeBinding),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SensorLog),
          useValue: {
            query: jest.fn(),
          },
        },
        {
          provide: ScadaAccessService,
          useValue: {
            getDiagramOrFail: jest.fn(),
            assertDiagramAccess: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ScadaRuntimeService>(ScadaRuntimeService);
    bindingRepository = module.get(getRepositoryToken(ScadaNodeBinding));
    sensorLogRepository = module.get(getRepositoryToken(SensorLog));
    accessService = module.get(ScadaAccessService);
  });

  it('returns runtime bindings with latest telemetry and ok status', async () => {
    accessService.getDiagramOrFail.mockResolvedValue({
      idScadaDiagram: 'diagram-1',
      idOwner: 'owner-1',
    } as ScadaDiagram);

    bindingRepository.find.mockResolvedValue([
      {
        idScadaNodeBinding: 'binding-1',
        idScadaNode: 'node-1',
        bindingKey: 'pressure',
        idSensorChannel: 'channel-1',
        displayLabel: 'Pressure',
        unitOverride: 'bar',
      } as ScadaNodeBinding,
    ]);

    sensorLogRepository.query.mockResolvedValue([
      {
        sensorChannelId: 'channel-1',
        sensorTypeId: 'sensor-type-1',
        category: 'pressure',
        unit: 'bar',
        precision: '2',
        minThreshold: '1',
        maxThreshold: '8',
        timestamp: new Date().toISOString(),
        value: '7.25',
        rawValue: '7.3',
        qualityFlag: 'good',
      },
    ]);

    const result = await service.getDiagramRuntime('diagram-1', {
      idUser: 'user-1',
      idOwner: 'owner-1',
      role: 'tenant',
    });

    expect(result.diagramId).toBe('diagram-1');
    expect(result.bindings).toHaveLength(1);
    expect(result.bindings[0]).toMatchObject({
      bindingId: 'binding-1',
      nodeId: 'node-1',
      sensorChannelId: 'channel-1',
      unit: 'bar',
      value: 7.25,
      rawValue: 7.3,
      status: 'ok',
      connectivityState: 'online',
      freshnessState: 'fresh',
    });
    expect(result.summary).toEqual({
      totalBindings: 1,
      offlineBindings: 0,
      staleBindings: 0,
    });
  });

  it('returns unknown status when telemetry is missing', async () => {
    accessService.getDiagramOrFail.mockResolvedValue({
      idScadaDiagram: 'diagram-1',
      idOwner: 'owner-1',
    } as ScadaDiagram);

    bindingRepository.find.mockResolvedValue([
      {
        idScadaNodeBinding: 'binding-1',
        idScadaNode: 'node-1',
        bindingKey: 'status',
        idSensorChannel: 'channel-1',
      } as ScadaNodeBinding,
    ]);

    sensorLogRepository.query.mockResolvedValue([]);

    const result = await service.getDiagramRuntime('diagram-1', {
      idUser: 'user-1',
      idOwner: 'owner-1',
      role: 'tenant',
    });

    expect(result.bindings[0].status).toBe('unknown');
    expect(result.bindings[0].value).toBeNull();
    expect(result.bindings[0].freshnessState).toBe('unknown');
    expect(result.summary).toEqual({
      totalBindings: 1,
      offlineBindings: 0,
      staleBindings: 0,
    });
  });

  it('returns alert status when threshold is exceeded', async () => {
    accessService.getDiagramOrFail.mockResolvedValue({
      idScadaDiagram: 'diagram-1',
      idOwner: 'owner-1',
    } as ScadaDiagram);

    bindingRepository.find.mockResolvedValue([
      {
        idScadaNodeBinding: 'binding-1',
        idScadaNode: 'node-1',
        bindingKey: 'pressure',
        idSensorChannel: 'channel-1',
      } as ScadaNodeBinding,
    ]);

    sensorLogRepository.query.mockResolvedValue([
      {
        sensorChannelId: 'channel-1',
        sensorTypeId: 'sensor-type-1',
        category: 'pressure',
        unit: 'bar',
        precision: '2',
        minThreshold: '1',
        maxThreshold: '8',
        timestamp: new Date().toISOString(),
        value: '10.5',
        rawValue: '10.7',
        qualityFlag: 'good',
      },
    ]);

    const result = await service.getDiagramRuntime('diagram-1', {
      idUser: 'user-1',
      idOwner: 'owner-1',
      role: 'tenant',
    });

    expect(result.bindings[0].status).toBe('alert');
  });

  it('returns off status for zero-value boolean-like categories', async () => {
    accessService.getDiagramOrFail.mockResolvedValue({
      idScadaDiagram: 'diagram-1',
      idOwner: 'owner-1',
    } as ScadaDiagram);

    bindingRepository.find.mockResolvedValue([
      {
        idScadaNodeBinding: 'binding-1',
        idScadaNode: 'node-1',
        bindingKey: 'status',
        idSensorChannel: 'channel-1',
      } as ScadaNodeBinding,
    ]);

    sensorLogRepository.query.mockResolvedValue([
      {
        sensorChannelId: 'channel-1',
        sensorTypeId: 'sensor-type-1',
        category: 'status',
        unit: null,
        precision: null,
        minThreshold: null,
        maxThreshold: null,
        timestamp: new Date().toISOString(),
        value: '0',
        rawValue: '0',
        qualityFlag: 'good',
      },
    ]);

    const result = await service.getDiagramRuntime('diagram-1', {
      idUser: 'user-1',
      idOwner: 'owner-1',
      role: 'tenant',
    });

    expect(result.bindings[0].status).toBe('off');
  });

  it('returns warn status for degraded quality telemetry', async () => {
    accessService.getDiagramOrFail.mockResolvedValue({
      idScadaDiagram: 'diagram-1',
      idOwner: 'owner-1',
    } as ScadaDiagram);

    bindingRepository.find.mockResolvedValue([
      {
        idScadaNodeBinding: 'binding-1',
        idScadaNode: 'node-1',
        bindingKey: 'pressure',
        idSensorChannel: 'channel-1',
      } as ScadaNodeBinding,
    ]);

    sensorLogRepository.query.mockResolvedValue([
      {
        sensorChannelId: 'channel-1',
        sensorTypeId: 'sensor-type-1',
        category: 'pressure',
        unit: 'bar',
        precision: '2',
        minThreshold: '1',
        maxThreshold: '8',
        timestamp: new Date().toISOString(),
        value: '5',
        rawValue: '5.1',
        qualityFlag: 'bad',
      },
    ]);

    const result = await service.getDiagramRuntime('diagram-1', {
      idUser: 'user-1',
      idOwner: 'owner-1',
      role: 'tenant',
    });

    expect(result.bindings[0].status).toBe('warn');
  });

  it('returns stale status for older telemetry and offline for very old telemetry', async () => {
    accessService.getDiagramOrFail.mockResolvedValue({
      idScadaDiagram: 'diagram-1',
      idOwner: 'owner-1',
    } as ScadaDiagram);

    bindingRepository.find.mockResolvedValue([
      {
        idScadaNodeBinding: 'binding-1',
        idScadaNode: 'node-1',
        bindingKey: 'pressure',
        idSensorChannel: 'channel-1',
      } as ScadaNodeBinding,
    ]);

    sensorLogRepository.query.mockResolvedValueOnce([
      {
        sensorChannelId: 'channel-1',
        sensorTypeId: 'sensor-type-1',
        category: 'pressure',
        unit: 'bar',
        precision: '2',
        minThreshold: '1',
        maxThreshold: '8',
        timestamp: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
        value: '5',
        rawValue: '5.2',
        qualityFlag: 'good',
      },
    ]);

    const staleResult = await service.getDiagramRuntime('diagram-1', {
      idUser: 'user-1',
      idOwner: 'owner-1',
      role: 'tenant',
    });

    expect(staleResult.bindings[0].status).toBe('stale');
    expect(staleResult.bindings[0].freshnessState).toBe('stale');
    expect(staleResult.summary).toEqual({
      totalBindings: 1,
      offlineBindings: 0,
      staleBindings: 1,
    });

    sensorLogRepository.query.mockResolvedValueOnce([
      {
        sensorChannelId: 'channel-1',
        sensorTypeId: 'sensor-type-1',
        category: 'pressure',
        unit: 'bar',
        precision: '2',
        minThreshold: '1',
        maxThreshold: '8',
        timestamp: new Date(Date.now() - 16 * 60 * 1000).toISOString(),
        value: '5',
        rawValue: '5.2',
        qualityFlag: 'good',
      },
    ]);

    const offlineResult = await service.getDiagramRuntime('diagram-1', {
      idUser: 'user-1',
      idOwner: 'owner-1',
      role: 'tenant',
    });

    expect(offlineResult.bindings[0].status).toBe('offline');
    expect(offlineResult.bindings[0].connectivityState).toBe('offline');
    expect(offlineResult.bindings[0].freshnessState).toBe('offline');
    expect(offlineResult.summary).toEqual({
      totalBindings: 1,
      offlineBindings: 1,
      staleBindings: 0,
    });
  });
});
