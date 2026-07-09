import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { BroadcastRootModule } from './modules/broadcast/broadcast-root.module';

/**
 * Entry point PROSES TERPISAH `iot-broadcast` (PM2 app kedua).
 * Worker latar tanpa HTTP — crash domain terpisah dari proses ingestion `iot-gateway`.
 * Jalan: node dist/broadcast-main.js  (lihat ecosystem.config.js app #2).
 */
async function bootstrap() {
  const logger = new Logger('BroadcastBootstrap');

  const app = await NestFactory.createApplicationContext(BroadcastRootModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });
  app.enableShutdownHooks();

  // Jaga proses tetap hidup & tak crash oleh error tak tertangani (§8-g).
  process.on('unhandledRejection', (reason) => {
    logger.error(`unhandledRejection: ${reason}`);
  });
  process.on('uncaughtException', (err) => {
    logger.error(`uncaughtException: ${err?.message}`, err?.stack);
  });

  logger.log('🚀 iot-broadcast worker berjalan (push MQTT ke broker PDAM)');
}

bootstrap();
