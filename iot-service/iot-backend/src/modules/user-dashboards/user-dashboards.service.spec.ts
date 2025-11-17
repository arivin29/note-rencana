import { Test, TestingModule } from '@nestjs/testing';
import { UserDashboardsService } from './user-dashboards.service';

describe('UserDashboardsService', () => {
  let service: UserDashboardsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserDashboardsService],
    }).compile();

    service = module.get<UserDashboardsService>(UserDashboardsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
