import { Test, TestingModule } from '@nestjs/testing';
import { UserDashboardsController } from './user-dashboards.controller';

describe('UserDashboardsController', () => {
  let controller: UserDashboardsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserDashboardsController],
    }).compile();

    controller = module.get<UserDashboardsController>(UserDashboardsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
