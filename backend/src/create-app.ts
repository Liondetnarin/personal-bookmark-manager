import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { AppConfig } from './config.js';
import { AppModule } from './app.module.js';

export async function createApp(config: AppConfig, logger: false | undefined = undefined) {
  const app = await NestFactory.create(AppModule.register(config), { logger });
  app.enableCors({
    origin: config.frontendOrigin,
    allowedHeaders: ['Authorization', 'Content-Type'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  app.enableShutdownHooks();
  return app;
}
