import { Test, TestingModule } from '@nestjs/testing';
import { SensorChannelsController } from './sensor-channels.controller';

describe('SensorChannelsController', () => {
  let controller: SensorChannelsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SensorChannelsController],
    }).compile();

    controller = module.get<SensorChannelsController>(SensorChannelsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
