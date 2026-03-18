import { ClassSerializerInterceptor, RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ExternalApiModule } from './modules/external-api/external-api.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api', {
    exclude: [
      { path: 'external-api', method: RequestMethod.ALL },
      { path: 'external-api/(.*)', method: RequestMethod.ALL },
    ],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  
  // Enable ClassSerializerInterceptor to respect @Exclude() decorators
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // ============================================
  // SWAGGER 1: Internal API (existing)
  // ============================================
  const internalSwaggerConfig = new DocumentBuilder()
    .setTitle('IoT Monitoring System API')
    .setDescription(
      'Complete IoT monitoring system REST API with nested data queries, aggregations, and real-time telemetry. ' +
      'Supports CRUD operations for all entities, complex queries with relations, and custom reports for dashboards.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Authentication', 'User authentication and authorization')
    .addTag('Owners', 'Owner management and statistics')
    .addTag('Projects', 'Project management endpoints')
    .addTag('Nodes', 'Node management and monitoring')
    .addTag('Sensors', 'Sensor configuration and data')
    .addTag('Telemetry', 'Real-time sensor data and logs')
    .addTag('Dashboards', 'Dashboard and widgets management')
    .addTag('Reports', 'Custom reports and analytics')
    .addTag('Alerts', 'Alert rules and events')
    .addTag('Tenant API Keys', 'Manage API keys for external access')
    .build();
  const internalDocument = SwaggerModule.createDocument(app, internalSwaggerConfig);
  SwaggerModule.setup('api', app, internalDocument);

  // ============================================
  // SWAGGER 2: External API (untuk Tenant)
  // ============================================
  const externalSwaggerConfig = new DocumentBuilder()
    .setTitle('Tenant External API')
    .setDescription(
      'REST API untuk tenant/customer mengakses data sensor IoT mereka.\n\n' +
      '## Authentication\n' +
      'Gunakan header `X-API-Key` untuk authentication.\n\n' +
      '## Rate Limiting\n' +
      '- Basic: 60 req/min, 10K/day\n' +
      '- Standard: 120 req/min, 50K/day\n' +
      '- Premium: 300 req/min, 100K/day\n\n' +
      '## Getting API Key\n' +
      'Login ke dashboard internal, lalu generate API key di menu Tenant API Keys.',
    )
    .setVersion('1.0.0')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
        description: 'API Key untuk authentication. Format: tnt_xxxxxxxx',
      },
      'X-API-Key',
    )
    .addTag('Info', 'Tenant information and API key status')
    .addTag('Projects', 'List projects owned by tenant')
    .addTag('Nodes', 'List and detail nodes/devices')
    .addTag('Sensors', 'List sensors and channels')
    .addTag('Sensor Data', 'Query telemetry data ⭐ Main Feature')
    .addTag('Alerts', 'Alert events')
    .build();
  const externalDocument = SwaggerModule.createDocument(app, externalSwaggerConfig, {
    include: [ExternalApiModule],
  });
  SwaggerModule.setup('external-api/docs', app, externalDocument);

  // Enable CORS with specific origins
  app.enableCors({
    origin: [
      'http://localhost:4300',           // Angular dev server
      'http://localhost:4200',           // Angular dev server
      'http://localhost:3000',           // Backend Swagger UI
      'https://devetek-helios.web.app',  // Firebase Hosting
      'https://devetek-helios.firebaseapp.com', // Firebase Hosting (alternative)
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type,Authorization,Accept,X-API-Key',
  });

  const configService = app.get(ConfigService);
  const portFromEnv = configService.get<string>('PORT');
  const port = Number(portFromEnv) || 3000;
  
  console.log(`📋 PORT from .env: ${portFromEnv}`);
  console.log(`📋 PORT parsed as number: ${port}`);
  
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Internal API Swagger: http://localhost:${port}/api`);
  console.log(`📚 External API Swagger: http://localhost:${port}/external-api/docs`);
}
bootstrap();
