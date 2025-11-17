import { Test, TestingModule } from '@nestjs/testing';
import { DashboardWidgetsController } from './dashboard-widgets.controller';

describe('DashboardWidgetsController', () => {
  let controller: DashboardWidgetsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardWidgetsController],
    }).compile();

    controller = module.get<DashboardWidgetsController>(DashboardWidgetsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
