import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SensorChannel } from '../../entities/sensor-channel.entity';
import { ScadaAccessService } from './scada-access.service';
import { ScadaBindingOptionsService } from './scada-binding-options.service';

describe('ScadaBindingOptionsService', () => {
  let service: ScadaBindingOptionsService;
  let sensorChannelRepository: jest.Mocked<Repository<SensorChannel>>;
  let accessService: jest.Mocked<ScadaAccessService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScadaBindingOptionsService,
        {
          provide: getRepositoryToken(SensorChannel),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: ScadaAccessService,
          useValue: {
            resolveOwnerScope: jest.fn(),
            assertProjectAccess: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ScadaBindingOptionsService>(ScadaBindingOptionsService);
    sensorChannelRepository = module.get(getRepositoryToken(SensorChannel));
    accessService = module.get(ScadaAccessService);
  });

  it('returns mapped binding options for the editor', async () => {
    accessService.resolveOwnerScope.mockReturnValue('owner-1');

    const queryBuilder: any = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          idSensorChannel: 'channel-1',
          metricCode: 'pressure',
          unit: 'bar',
          precision: '2',
          minThreshold: '1',
          maxThreshold: '8',
          sensor: {
            idSensor: 'sensor-1',
            label: 'Pressure Sensor',
            sensorCode: 'PS-01',
            status: 'active',
            node: {
              idNode: 'node-1',
              code: 'NODE-01',
              name: 'Pump House',
              project: {
                idProject: 'project-1',
                name: 'Project A',
              },
            },
          },
          sensorType: {
            idSensorType: 'type-1',
            category: 'pressure',
            defaultUnit: 'bar',
            precision: '2',
          },
        },
      ]),
    };

    sensorChannelRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.findAll(
      {
        projectId: 'project-1',
      },
      {
        idUser: 'user-1',
        idOwner: 'owner-1',
        role: 'tenant',
      },
    );

    expect(accessService.assertProjectAccess).toHaveBeenCalledWith('project-1', 'owner-1', expect.any(Object));
    expect(result[0]).toEqual({
      idSensorChannel: 'channel-1',
      metricCode: 'pressure',
      unit: 'bar',
      precision: 2,
      minThreshold: 1,
      maxThreshold: 8,
      sensor: {
        idSensor: 'sensor-1',
        label: 'Pressure Sensor',
        sensorCode: 'PS-01',
        status: 'active',
      },
      node: {
        idNode: 'node-1',
        code: 'NODE-01',
        name: 'Pump House',
      },
      project: {
        idProject: 'project-1',
        name: 'Project A',
      },
      sensorType: {
        idSensorType: 'type-1',
        category: 'pressure',
        defaultUnit: 'bar',
        precision: 2,
      },
    });
  });
});
