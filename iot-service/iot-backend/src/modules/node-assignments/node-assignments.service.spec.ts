import { Test, TestingModule } from '@nestjs/testing';
import { NodeAssignmentsService } from './node-assignments.service';

describe('NodeAssignmentsService', () => {
  let service: NodeAssignmentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NodeAssignmentsService],
    }).compile();

    service = module.get<NodeAssignmentsService>(NodeAssignmentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
