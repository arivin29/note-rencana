import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClickhouseService } from './clickhouse.service';
import clickhouseConfig from '../../config/clickhouse.config';

@Global()
@Module({
  imports: [
    ConfigModule.forFeature(clickhouseConfig),
  ],
  providers: [ClickhouseService],
  exports: [ClickhouseService],
})
export class ClickhouseModule {}
