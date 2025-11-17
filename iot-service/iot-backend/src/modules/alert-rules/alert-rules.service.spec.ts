import { Test, TestingModule } from '@nestjs/testing';
import { AlertRulesService } from './alert-rules.service';

describe('AlertRulesService', () => {
  let service: AlertRulesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlertRulesService],
    }).compile();

    service = module.get<AlertRulesService>(AlertRulesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
