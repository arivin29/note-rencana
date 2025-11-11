import { Test, TestingModule } from '@nestjs/testing';
import { NodeModelsController } from './node-models.controller';

describe('NodeModelsController', () => {
  let controller: NodeModelsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NodeModelsController],
    }).compile();

    controller = module.get<NodeModelsController>(NodeModelsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
