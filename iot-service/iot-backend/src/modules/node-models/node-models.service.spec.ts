import { Test, TestingModule } from '@nestjs/testing';
import { NodeModelsService } from './node-models.service';

describe('NodeModelsService', () => {
  let service: NodeModelsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NodeModelsService],
    }).compile();

    service = module.get<NodeModelsService>(NodeModelsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
