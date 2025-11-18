import { INestApplication } from '@nestjs/common';

export function enableCorsSetup(app: INestApplication) {
  app.enableCors({
    origin: true, // Allow all origins in development/testing
    credentials: true, // Essential for cookies to work
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
  });
}
