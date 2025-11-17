import { Test, TestingModule } from '@nestjs/testing';
import { AlertEventsController } from './alert-events.controller';

describe('AlertEventsController', () => {
  let controller: AlertEventsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlertEventsController],
    }).compile();

    controller = module.get<AlertEventsController>(AlertEventsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
