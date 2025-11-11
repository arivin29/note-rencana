import { Test, TestingModule } from '@nestjs/testing';
import { SensorCatalogsService } from './sensor-catalogs.service';

describe('SensorCatalogsService', () => {
  let service: SensorCatalogsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SensorCatalogsService],
    }).compile();

    service = module.get<SensorCatalogsService>(SensorCatalogsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
