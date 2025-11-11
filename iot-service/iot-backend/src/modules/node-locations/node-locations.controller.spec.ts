import { Test, TestingModule } from '@nestjs/testing';
import { NodeLocationsController } from './node-locations.controller';

describe('NodeLocationsController', () => {
  let controller: NodeLocationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NodeLocationsController],
    }).compile();

    controller = module.get<NodeLocationsController>(NodeLocationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
