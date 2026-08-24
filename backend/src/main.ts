import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Global API Prefix
  app.setGlobalPrefix('api');

  // CORS Configuration
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Global Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger / OpenAPI Setup
  const config = new DocumentBuilder()
    .setTitle('ShowReserve — Ticket Booking Engine API')
    .setDescription(
      'Production-grade RESTful API documentation for real-time ticket booking, distributed seat holds, TTL auto-release, FIFO waitlists, and QR ticketing.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter your Bearer Access Token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Authentication', 'User registration, login, token refresh, and profile endpoints')
    .addTag('Venues', 'Admin venue management and structured grid seating layouts')
    .addTag('Events', 'Movie & Concert event listings and browsing filters')
    .addTag('Shows', 'Showtimes, visual seat maps, and pricing')
    .addTag('Holds', 'Concurrency-safe seat selection with TTL countdown')
    .addTag('Bookings', 'Checkout, booking confirmation, QR tickets, and cancellation')
    .addTag('Waitlists', 'Category-specific FIFO waitlists and time-limited claim offers')
    .addTag('Organiser', 'Revenue, bookings overview, and category sales analytics')
    .addTag('Admin', 'System metrics and platform-wide monitoring')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: 'ShowReserve API Docs',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 Server running on http://localhost:${port}/api`);
  logger.log(`📚 Swagger documentation available at http://localhost:${port}/api/docs`);
}

bootstrap();
