import { Test, TestingModule } from '@nestjs/testing';
import { NodeLocationsService } from './node-locations.service';

describe('NodeLocationsService', () => {
  let service: NodeLocationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NodeLocationsService],
    }).compile();

    service = module.get<NodeLocationsService>(NodeLocationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
