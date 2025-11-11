import { Test, TestingModule } from '@nestjs/testing';
import { SensorCatalogsController } from './sensor-catalogs.controller';

describe('SensorCatalogsController', () => {
  let controller: SensorCatalogsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SensorCatalogsController],
    }).compile();

    controller = module.get<SensorCatalogsController>(SensorCatalogsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
