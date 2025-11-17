import { Test, TestingModule } from '@nestjs/testing';
import { SensorChannelsService } from './sensor-channels.service';

describe('SensorChannelsService', () => {
  let service: SensorChannelsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SensorChannelsService],
    }).compile();

    service = module.get<SensorChannelsService>(SensorChannelsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
