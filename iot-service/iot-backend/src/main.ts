import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
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

  const swaggerConfig = new DocumentBuilder()
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
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document);

  // Enable CORS with specific origins
  app.enableCors({
    origin: [
      'http://localhost:4200',           // Angular dev server
      'http://localhost:3000',           // Backend Swagger UI
      'https://devetek-helios.web.app',  // Firebase Hosting
      'https://devetek-helios.firebaseapp.com', // Firebase Hosting (alternative)
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type,Authorization,Accept',
  });

  const configService = app.get(ConfigService);
  const port = Number(configService.get<string>('PORT')) || 3000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/api`);
}
bootstrap();
