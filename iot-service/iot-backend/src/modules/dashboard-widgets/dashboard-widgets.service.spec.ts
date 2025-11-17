import { Test, TestingModule } from '@nestjs/testing';
import { DashboardWidgetsService } from './dashboard-widgets.service';

describe('DashboardWidgetsService', () => {
  let service: DashboardWidgetsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DashboardWidgetsService],
    }).compile();

    service = module.get<DashboardWidgetsService>(DashboardWidgetsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
