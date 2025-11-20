import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async check() {
    return this.healthService.checkAll();
  }

  @Get('database')
  async checkDatabase() {
    return this.healthService.checkDatabase();
  }

  @Get('mqtt')
  async checkMqtt() {
    return this.healthService.checkMqtt();
  }
}
