import { Test, TestingModule } from '@nestjs/testing';
import { NodeAssignmentsController } from './node-assignments.controller';

describe('NodeAssignmentsController', () => {
  let controller: NodeAssignmentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NodeAssignmentsController],
    }).compile();

    controller = module.get<NodeAssignmentsController>(NodeAssignmentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
