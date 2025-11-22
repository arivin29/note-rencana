import { Test, TestingModule } from '@nestjs/testing';
import { NodeProfilesService } from './node-profiles.service';

describe('NodeProfilesService', () => {
  let service: NodeProfilesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NodeProfilesService],
    }).compile();

    service = module.get<NodeProfilesService>(NodeProfilesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
