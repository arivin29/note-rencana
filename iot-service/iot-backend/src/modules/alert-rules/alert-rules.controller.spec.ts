import { Test, TestingModule } from '@nestjs/testing';
import { AlertRulesController } from './alert-rules.controller';

describe('AlertRulesController', () => {
  let controller: AlertRulesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlertRulesController],
    }).compile();

    controller = module.get<AlertRulesController>(AlertRulesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
