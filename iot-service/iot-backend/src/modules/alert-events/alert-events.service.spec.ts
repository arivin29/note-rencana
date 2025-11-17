import { Test, TestingModule } from '@nestjs/testing';
import { AlertEventsService } from './alert-events.service';

describe('AlertEventsService', () => {
  let service: AlertEventsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlertEventsService],
    }).compile();

    service = module.get<AlertEventsService>(AlertEventsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
