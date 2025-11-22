import { Test, TestingModule } from '@nestjs/testing';
import { NodeProfilesController } from './node-profiles.controller';
import { NodeProfilesService } from './node-profiles.service';

describe('NodeProfilesController', () => {
  let controller: NodeProfilesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NodeProfilesController],
      providers: [NodeProfilesService],
    }).compile();

    controller = module.get<NodeProfilesController>(NodeProfilesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
